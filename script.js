// State management
let svgLibrary = [];
let currentSvg = null;
let linkedSize = true;
let currentView = "grid";
let currentPage = 1;
let itemsPerPage = 50;
let filteredSVGs = [];
let filters = {
  category: "all",
  size: "all",
  color: "all",
  search: ""
};

// Default SVG settings
const defaultSettings = {
  width: 100,
  height: 100,
  fillColor: "#e2e8f0",
  bgColor: "#1e293b",
  strokeColor: "#e2e8f0",
  strokeWidth: 2,
  opacity: 100,
  rotation: 0,
  shadow: 0
};

// ============================================
// AUTOMATIC SVG LOADER FROM GITHUB
// ============================================

// Configure your repository details here
const REPO_CONFIG = {
  owner: "ClockBlocked",
  repo: "FontAwesome.Professional",
  svgFolder: "icons",
  branch: "main"
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  loadSVGsFromGitHub();
});

// Auto-load SVGs from GitHub repository
async function loadSVGsFromGitHub() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const uploadArea = document.getElementById("uploadArea");
  
  loadingIndicator.classList.add("active");
  uploadArea.style.display = "none";
  loadingIndicator.querySelector("p").textContent = "Loading icons from repository...";

  try {
    const apiUrl = `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${REPO_CONFIG.svgFolder}?ref=${REPO_CONFIG.branch}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const files = await response.json();
    
    const svgFiles = files.filter(file => 
      file.name.endsWith('.svg') && file.type === 'file'
    );

    if (svgFiles.length === 0) {
      throw new Error("No SVG files found in the icons folder");
    }

    showToast(`Found ${svgFiles.length} SVG files. Loading...`, "success");

    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < svgFiles.length; i += batchSize) {
      const batch = svgFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        try {
          const svgResponse = await fetch(file.download_url);
          const svgContent = await svgResponse.text();
          
          addSvgToLibraryQuick(svgContent, file.name);
          processed++;
          
          loadingIndicator.querySelector("p").textContent = 
            `Loading icons... ${processed}/${svgFiles.length}`;
        } catch (error) {
          console.error(`Failed to load ${file.name}:`, error);
        }
      }));

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    loadingIndicator.classList.remove("active");
    uploadArea.style.display = "block";
    
    renderSVGs();
    updateHeroCount();
    showToast(`Successfully loaded ${processed} icons!`, "success");

  } catch (error) {
    console.error("Error loading SVGs from GitHub:", error);
    loadingIndicator.classList.remove("active");
    uploadArea.style.display = "block";
    
    showToast(`Failed to auto-load icons: ${error.message}. Please upload SVG files manually or check your icons folder.`, "error");
    
    loadDemoSVGs();
  }
}

// Event Listeners
function initializeEventListeners() {
  const fileInput = document.getElementById("fileInput");
  fileInput.addEventListener("change", handleFileUpload);

  const uploadArea = document.getElementById("uploadArea");
  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });
  uploadArea.addEventListener("drop", handleDrop);

  document.getElementById("searchInput").addEventListener("input", (e) => {
    filters.search = e.target.value.toLowerCase();
    renderSVGs();
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      document.getElementById("svgGrid").style.display = currentView === "grid" ? "grid" : "none";
      document.getElementById("svgList").style.display = currentView === "list" ? "flex" : "none";
      renderSVGs();
    });
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const parent = chip.parentElement;
      parent.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

      if (parent.id === "categoryFilters") {
        filters.category = chip.dataset.category;
      } else if (parent.id === "sizeFilters") {
        filters.size = chip.dataset.size;
      } else if (parent.id === "colorFilters") {
        filters.color = chip.dataset.color;
      }
      renderSVGs();
    });
  });

  document.getElementById("linkSizeBtn").addEventListener("click", toggleLinkSize);
  document.getElementById("widthInput").addEventListener("input", handleSizeChange);
  document.getElementById("heightInput").addEventListener("input", handleSizeChange);
  document.getElementById("fillColorInput").addEventListener("input", updateSvgPreview);
  document.getElementById("bgColorInput").addEventListener("input", updateSvgPreview);
  document.getElementById("strokeColorInput").addEventListener("input", updateSvgPreview);
  document.getElementById("strokeWidthSlider").addEventListener("input", updateSvgPreview);
  document.getElementById("opacitySlider").addEventListener("input", updateSvgPreview);
  document.getElementById("rotationSlider").addEventListener("input", updateSvgPreview);
  document.getElementById("shadowSlider").addEventListener("input", updateSvgPreview);

  document.querySelectorAll(".slider").forEach((slider) => {
    slider.addEventListener("input", (e) => {
      const valueSpan = document.getElementById(e.target.id.replace("Slider", "Value"));
      if (valueSpan) {
        let value = e.target.value;
        if (e.target.id === "opacitySlider") value += "%";
        else if (e.target.id === "rotationSlider") value += "°";
        else if (e.target.id === "shadowSlider") value += "px";
        valueSpan.textContent = value;
      }
    });
  });

  document.getElementById("svgModal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop") || e.target.id === "svgModal") {
      closeModal();
    }
  });
}

// File handling with batch processing
async function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  const loadingIndicator = document.getElementById("loadingIndicator");
  const uploadArea = document.getElementById("uploadArea");

  loadingIndicator.classList.add("active");
  uploadArea.style.display = "none";

  const batchSize = 100;
  let processed = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await processBatch(batch);
    processed += batch.length;

    loadingIndicator.querySelector("#loadingIndicator p").textContent = 
      `Processing SVGs... ${processed}/${files.length}`;

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  loadingIndicator.classList.remove("active");
  uploadArea.style.display = "block";

  renderSVGs();
  updateHeroCount();
  showToast(`Successfully loaded ${files.length} SVGs!`, "success");
}

async function processBatch(files) {
  const promises = files.map((file) => {
    return new Promise((resolve) => {
      if (file.type === "image/svg+xml" || file.name.endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          addSvgToLibraryQuick(e.target.result, file.name);
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsText(file);
      } else {
        resolve();
      }
    });
  });

  await Promise.all(promises);
}





/**
function addSvgToLibraryQuick(content, name) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svgElement = doc.querySelector("svg");

  if (svgElement) {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const svg = {
      id,
      name: name.replace(".svg", ""),
      content,
      category: determineCategoryFromName(name),
      size: determineSize(svgElement),
      colorMode: determineColorMode(svgElement),
      settings: { ...defaultSettings }
    };

    svgLibrary.push(svg);

    if (svgLibrary.length > 0) {
      document.getElementById("exportCodeBtn").style.display = "flex";
    }
  }
}
***/



function addSvgToLibraryQuick(content, name) {
  // First, try to treat it as a sprite sheet
  if (ingestSpriteSheet(content, name)) {
    return; // handled all <symbol> entries
  }

  // Fallback: single-icon SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svgElement = doc.querySelector("svg");
  if (!svgElement) return;

  addSvgRecord(content, name.replace(/\.svg$/i, ""), svgElement);
}


function determineCategoryFromName(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("logo") || lowerName.includes("brand")) return "logos";
  if (lowerName.includes("illustration") || lowerName.includes("illust")) return "illustrations";
  return "icons";
}

async function handleDrop(e) {
  e.preventDefault();
  document.getElementById("uploadArea").classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files);

  const fakeEvent = { target: { files } };
  await handleFileUpload(fakeEvent);
}

function determineSize(svgElement) {
  const width = parseInt(svgElement.getAttribute("width")) || 0;
  const height = parseInt(svgElement.getAttribute("height")) || 0;
  const viewBox = svgElement.getAttribute("viewBox");
  
  let max = Math.max(width, height);
  
  if (!max && viewBox) {
    const parts = viewBox.split(" ");
    if (parts.length === 4) {
      max = Math.max(parseFloat(parts[2]), parseFloat(parts[3]));
    }
  }

  if (max <= 32) return "small";
  if (max <= 128) return "medium";
  return "large";
}

function determineColorMode(svgElement) {
  const fills = svgElement.querySelectorAll('[fill]:not([fill="none"])');
  const strokes = svgElement.querySelectorAll('[stroke]:not([stroke="none"])');
  const uniqueColors = new Set();

  fills.forEach((el) => uniqueColors.add(el.getAttribute("fill")));
  strokes.forEach((el) => uniqueColors.add(el.getAttribute("stroke")));

  return uniqueColors.size > 2 ? "multi" : "mono";
}

function renderSVGs() {
  filteredSVGs = svgLibrary.filter((svg) => {
    if (filters.category !== "all" && svg.category !== filters.category) return false;
    if (filters.size !== "all" && svg.size !== filters.size) return false;
    if (filters.color !== "all" && svg.colorMode !== filters.color) return false;
    if (filters.search && !svg.name.toLowerCase().includes(filters.search)) return false;
    return true;
  });

  currentPage = 1;
  document.getElementById("svgCount").textContent = `${filteredSVGs.length} SVG${filteredSVGs.length !== 1 ? 's' : ''}`;

  const filteredBadge = document.getElementById("filteredBadge");
  if (filteredSVGs.length !== svgLibrary.length) {
    filteredBadge.textContent = `of ${svgLibrary.length}`;
    filteredBadge.style.display = "inline-block";
  } else {
    filteredBadge.style.display = "none";
  }

  renderCurrentPage();
  updateHeroCount();
}

function renderCurrentPage() {
  const totalPages = Math.ceil(filteredSVGs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredSVGs.length);

  const pageSVGs = filteredSVGs.slice(startIndex, endIndex);

  if (currentView === "grid") {
    const grid = document.getElementById("svgGrid");
    grid.innerHTML = "";
    renderGrid(pageSVGs);
  } else {
    const list = document.getElementById("svgList");
    list.innerHTML = "";
    renderList(pageSVGs);
  }

  updatePaginationUI(totalPages);
  window.scrollTo({ top: 200, behavior: "smooth" });
}

function updatePaginationUI(totalPages) {
  const pageNumbers = document.getElementById("pageNumbers");
  const prevBtn = document.getElementById("prevButton");
  const nextBtn = document.getElementById("nextButton");

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;

  pageNumbers.innerHTML = "";
  
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.className = i === currentPage ? "page-button filled" : "page-button text";
    btn.textContent = i;
    btn.dataset.page = i;
    btn.addEventListener("click", () => {
      currentPage = i;
      renderCurrentPage();
    });
    pageNumbers.appendChild(btn);
  }

  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  };

  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
    }
  };
}

function renderGrid(svgs) {
  const grid = document.getElementById("svgGrid");
  grid.innerHTML = svgs
    .map(
      (svg) => `
        <div class="svg-card" onclick="openModal('${svg.id}')">
          <div class="svg-preview">${svg.content}</div>
          <div class="svg-name">${svg.name}</div>
        </div>
      `
    )
    .join("");
}

function renderList(svgs) {
  const list = document.getElementById("svgList");
  list.innerHTML = svgs
    .map(
      (svg) => `
        <div class="svg-list-item" onclick="openModal('${svg.id}')">
          <div class="svg-list-preview">${svg.content}</div>
          <div class="svg-list-info">
            <div class="svg-list-name">${svg.name}</div>
            <div class="svg-list-meta">${svg.size} • ${svg.colorMode}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function openModal(id) {
  currentSvg = svgLibrary.find((svg) => svg.id === id);
  if (!currentSvg) return;

  document.getElementById("modalTitle").textContent = currentSvg.name;
  document.getElementById("svgModal").style.display = "flex";

  const settings = currentSvg.settings;
  document.getElementById("widthInput").value = settings.width;
  document.getElementById("heightInput").value = settings.height;
  document.getElementById("fillColorInput").value = settings.fillColor;
  document.getElementById("bgColorInput").value = settings.bgColor;
  document.getElementById("strokeColorInput").value = settings.strokeColor;
  document.getElementById("strokeWidthSlider").value = settings.strokeWidth;
  document.getElementById("strokeWidthValue").textContent = settings.strokeWidth;
  document.getElementById("opacitySlider").value = settings.opacity;
  document.getElementById("opacityValue").textContent = settings.opacity + "%";
  document.getElementById("rotationSlider").value = settings.rotation;
  document.getElementById("rotationValue").textContent = settings.rotation + "°";
  document.getElementById("shadowSlider").value = settings.shadow;
  document.getElementById("shadowValue").textContent = settings.shadow + "px";

  updateSvgPreview();
}

function closeModal() {
  document.getElementById("svgModal").style.display = "none";
  currentSvg = null;
}

function toggleLinkSize() {
  linkedSize = !linkedSize;
  document.getElementById("linkSizeBtn").classList.toggle("active", linkedSize);
}

function handleSizeChange(e) {
  if (!linkedSize) {
    updateSvgPreview();
    return;
  }

  const width = parseInt(document.getElementById("widthInput").value) || 100;
  const height = parseInt(document.getElementById("heightInput").value) || 100;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(currentSvg.content, "image/svg+xml");
  const svgElement = doc.querySelector("svg");
  
  const origWidth = parseInt(svgElement.getAttribute("width")) || 100;
  const origHeight = parseInt(svgElement.getAttribute("height")) || 100;
  const aspectRatio = origWidth / origHeight;

  if (e.target.id === "widthInput") {
    document.getElementById("heightInput").value = Math.round(width / aspectRatio);
  } else {
    document.getElementById("widthInput").value = Math.round(height * aspectRatio);
  }

  updateSvgPreview();
}

function updateSvgPreview() {
  if (!currentSvg) return;

  const width = document.getElementById("widthInput").value;
  const height = document.getElementById("heightInput").value;
  const fillColor = document.getElementById("fillColorInput").value;
  const bgColor = document.getElementById("bgColorInput").value;
  const strokeColor = document.getElementById("strokeColorInput").value;
  const strokeWidth = document.getElementById("strokeWidthSlider").value;
  const opacity = document.getElementById("opacitySlider").value / 100;
  const rotation = document.getElementById("rotationSlider").value;
  const shadow = document.getElementById("shadowSlider").value;

  const parser = new DOMParser();
  const doc = parser.parseFromString(currentSvg.content, "image/svg+xml");
  const svgElement = doc.querySelector("svg");

  svgElement.setAttribute("width", width);
  svgElement.setAttribute("height", height);

  svgElement.style.backgroundColor = bgColor;
  svgElement.style.opacity = opacity;
  svgElement.style.transform = `rotate(${rotation}deg)`;
  svgElement.style.filter =
    shadow > 0
      ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0, 0, 0, 0.3))`
      : "none";

  doc.querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line").forEach((el) => {
    if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") {
      el.setAttribute("fill", fillColor);
    }
    if (el.getAttribute("stroke") && el.getAttribute("stroke") !== "none") {
      el.setAttribute("stroke", strokeColor);
      el.setAttribute("stroke-width", strokeWidth);
    }
  });

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  document.getElementById("modalSvgPreview").innerHTML = svgString;

  const formattedCode = formatSvgCode(svgString);
  document.getElementById("codePreview").textContent = formattedCode;

  currentSvg.settings = {
    width,
    height,
    fillColor,
    bgColor,
    strokeColor,
    strokeWidth,
    opacity: opacity * 100,
    rotation,
    shadow
  };
}

function formatSvgCode(code) {
  return code
    .replace(/></g, ">\n<")
    .replace(/(\w+)="([^"]*)"/g, '\n  $1="$2"')
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function resetSettings() {
  if (!currentSvg) return;
  currentSvg.settings = { ...defaultSettings };
  openModal(currentSvg.id);
}

function downloadSVG() {
  if (!currentSvg) return;

  const svgContent = document.getElementById("modalSvgPreview").innerHTML;
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentSvg.name}-edited.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("SVG downloaded successfully!", "success");
}

function copyCode() {
  const code = document.getElementById("codePreview").textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.querySelector(".copy-code-btn");
    const originalHTML = btn.innerHTML;
    
    btn.classList.add("copied");
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;

    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = originalHTML;
    }, 2000);

    showToast("Code copied to clipboard!", "success");
  });
}

function toggleAdvanced(header) {
  const content = document.getElementById("advancedOptions");
  content.classList.toggle("active");
  header.classList.toggle("active");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const icon = document.getElementById("toastIcon");
  const msg = document.getElementById("toastMessage");

  toast.className = `toast ${type}`;
  msg.textContent = message;

  if (type === "success") {
    icon.innerHTML = "✓";
  } else {
    icon.innerHTML = "✕";
  }

  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function exportAsCode() {
  if (svgLibrary.length === 0) {
    showToast("No SVGs to export!", "error");
    return;
  }

  const svgArray = svgLibrary.map((svg) => {
    const cleanContent = svg.content
      .replace(/\n/g, "")
      .replace(/\s+/g, " ")
      .replace(/> </g, "><")
      .trim();

    return `  {
    name: '${svg.name}',
    content: '${cleanContent}'
  }`;
  });

  const code = `const fontAwesomeIcons = [\n${svgArray.join(",\n")}\n];`;

  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fontawesome-icons-array.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${svgLibrary.length} SVGs as code!`, "success");
}

function updateHeroCount() {
  const heroCount = document.getElementById("heroIconCount");
  if (heroCount) {
    animateNumber(heroCount, 0, svgLibrary.length, 1000);
  }
}

function animateNumber(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= end) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current).toLocaleString();
  }, 16);
}

function resetFilters() {
  filters = {
    category: "all",
    size: "all",
    color: "all",
    search: ""
  };

  document.getElementById("searchInput").value = "";
  
  document.querySelectorAll(".chip").forEach(chip => {
    chip.classList.remove("active");
    if (chip.dataset.category === "all" || chip.dataset.size === "all" || chip.dataset.color === "all") {
      chip.classList.add("active");
    }
  });

  renderSVGs();
  showToast("Filters reset", "success");
}

function loadDemoSVGs() {
  const demoSVGs = [
    {
      name: "Home",
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
    },
    {
      name: "Settings",
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/></svg>'
    },
    {
      name: "User",
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    }
  ];

  demoSVGs.forEach((svg) => {
    addSvgToLibraryQuick(svg.content, svg.name);
  });

  renderSVGs();
  updateHeroCount();
}





/** N E W **/
function addSvgRecord(content, name, svgElement) {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  const svg = {
    id,
    name,
    content,
    category: "icons",
    size: determineSize(svgElement),
    colorMode: determineColorMode(svgElement),
    settings: { ...defaultSettings }
  };
  svgLibrary.push(svg);
  if (svgLibrary.length > 0) {
    document.getElementById("exportCodeBtn").style.display = "flex";
  }
}

function ingestSpriteSheet(content, fileName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");

  const SVG_NS = "http://www.w3.org/2000/svg";
  const symbols = Array.from(doc.getElementsByTagNameNS(SVG_NS, "symbol"));

  // If nothing found via namespace-aware lookup, try a loose fallback
  const looseSymbols = symbols.length
    ? symbols
    : Array.from(doc.querySelectorAll("symbol, [id][viewBox]"));

  if (looseSymbols.length === 0) return false;

  const sheetViewBox =
    doc.documentElement.getAttribute("viewBox") || "0 0 24 24";

  looseSymbols.forEach((sym) => {
    // Skip container symbols that only wrap other symbols (no graphic children)
    const hasGraphicChildren = sym.querySelector(
      "path, rect, circle, ellipse, polygon, polyline, line, g, use"
    );
    if (!hasGraphicChildren) return;

    const id = sym.getAttribute("id") || "icon";
    const viewBox = sym.getAttribute("viewBox") || sheetViewBox;

    // Build standalone <svg> by cloning the symbol’s children
    const outDoc = document.implementation.createDocument(SVG_NS, "svg", null);
    const svgOut = outDoc.documentElement;
    svgOut.setAttribute("xmlns", SVG_NS);
    svgOut.setAttribute("viewBox", viewBox);
    svgOut.setAttribute("width", "24");
    svgOut.setAttribute("height", "24");

    Array.from(sym.childNodes).forEach((node) => {
      svgOut.appendChild(node.cloneNode(true));
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgOut);

    // Name format: spriteFileName/iconId
    const iconName = `${fileName.replace(/\.svg$/i, "")}/${id}`;
    addSvgRecord(svgString, iconName, svgOut);
  });

  return true;
}



