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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  loadDemoSVGs();
});

// Event Listeners
function initializeEventListeners() {
  // File upload
  const fileInput = document.getElementById("fileInput");
  fileInput.addEventListener("change", handleFileUpload);

  // Drag and drop
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

  // Search
  document.getElementById("searchInput").addEventListener("input", (e) => {
    filters.search = e.target.value.toLowerCase();
    renderSVGs();
  });

  // View toggles
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".view-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      document.getElementById("svgGrid").style.display =
        currentView === "grid" ? "grid" : "none";
      document.getElementById("svgList").style.display =
        currentView === "list" ? "flex" : "none";
      renderSVGs();
    });
  });

  // Filters
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const parent = chip.parentElement;
      parent
        .querySelectorAll(".chip")
        .forEach((c) => c.classList.remove("active"));
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

  // Modal controls
  document
    .getElementById("linkSizeBtn")
    .addEventListener("click", toggleLinkSize);
  document
    .getElementById("widthInput")
    .addEventListener("input", handleSizeChange);
  document
    .getElementById("heightInput")
    .addEventListener("input", handleSizeChange);
  document
    .getElementById("fillColorInput")
    .addEventListener("input", updateSvgPreview);
  document
    .getElementById("bgColorInput")
    .addEventListener("input", updateSvgPreview);
  document
    .getElementById("strokeColorInput")
    .addEventListener("input", updateSvgPreview);
  document
    .getElementById("strokeWidthSlider")
    .addEventListener("input", updateSvgPreview);
  document
    .getElementById("opacitySlider")
    .addEventListener("input", updateSvgPreview);
  document
    .getElementById("rotationSlider")
    .addEventListener("input", updateSvgPreview);
  document
    .getElementById("shadowSlider")
    .addEventListener("input", updateSvgPreview);

  // Update slider values
  document.querySelectorAll(".slider").forEach((slider) => {
    slider.addEventListener("input", (e) => {
      const valueSpan = e.target.parentElement.querySelector(".slider-value");
      if (valueSpan) {
        let value = e.target.value;
        if (e.target.id === "opacitySlider") value += "%";
        else if (e.target.id === "rotationSlider") value += "°";
        else if (e.target.id === "shadowSlider") value += "px";
        valueSpan.textContent = value;
      }
    });
  });

  // Close modal on backdrop click
  document.getElementById("svgModal").addEventListener("click", (e) => {
    if (e.target.id === "svgModal") {
      closeModal();
    }
  });
}

// File handling with batch processing
async function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  // Show loading indicator
  document.getElementById("loadingIndicator").classList.add("active");
  document.getElementById("uploadArea").style.display = "none";

  // Process files in batches to prevent UI freezing
  const batchSize = 100;
  let processed = 0;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    // Process batch
    await processBatch(batch);
    processed += batch.length;

    // Update loading message
    document.querySelector(
      "#loadingIndicator p"
    ).textContent = `Processing SVGs... ${processed}/${files.length}`;

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Hide loading and show upload area again
  document.getElementById("loadingIndicator").classList.remove("active");
  document.getElementById("uploadArea").style.display = "block";

  renderSVGs();
  showToast(`Successfully loaded ${files.length} SVGs!`, "success");
}

async function processBatch(files) {
  const promises = files.map((file) => {
    return new Promise((resolve) => {
      if (file.type === "image/svg+xml") {
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

// Optimized version for bulk loading
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
      category: "icons",
      size: determineSize(svgElement),
      colorMode: determineColorMode(svgElement),
      settings: { ...defaultSettings }
    };

    svgLibrary.push(svg);

    // Show export button if we have SVGs
    if (svgLibrary.length > 0) {
      document.getElementById("exportCodeBtn").style.display = "flex";
    }
  }
}

async function handleDrop(e) {
  e.preventDefault();
  document.getElementById("uploadArea").classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files);

  // Create a fake event object to reuse handleFileUpload
  const fakeEvent = { target: { files } };
  await handleFileUpload(fakeEvent);
}

// SVG Management
function addSvgToLibrary(content, name) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "image/svg+xml");
  const svgElement = doc.querySelector("svg");

  if (svgElement) {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const svg = {
      id,
      name: name.replace(".svg", ""),
      content,
      category: "icons", // Default category
      size: determineSize(svgElement),
      colorMode: determineColorMode(svgElement),
      settings: { ...defaultSettings }
    };

    svgLibrary.push(svg);
    renderSVGs();
    showToast("SVG added successfully!", "success");

    // Show export button if we have SVGs
    if (svgLibrary.length > 0) {
      document.getElementById("exportCodeBtn").style.display = "flex";
    }
  }
}

function determineSize(svgElement) {
  const width = parseInt(svgElement.getAttribute("width")) || 0;
  const height = parseInt(svgElement.getAttribute("height")) || 0;
  const max = Math.max(width, height);

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

// Rendering with Pagination
function renderSVGs() {
  // Filter SVGs
  filteredSVGs = svgLibrary.filter((svg) => {
    if (filters.category !== "all" && svg.category !== filters.category)
      return false;
    if (filters.size !== "all" && svg.size !== filters.size) return false;
    if (filters.color !== "all" && svg.colorMode !== filters.color)
      return false;
    if (filters.search && !svg.name.toLowerCase().includes(filters.search))
      return false;
    return true;
  });

  // Reset to page 1 when filters change
  currentPage = 1;

  // Update count
  document.getElementById(
    "svgCount"
  ).textContent = `${filteredSVGs.length} SVGs`;

  // Render current page
  renderCurrentPage();
}

function renderCurrentPage() {
  const totalPages = Math.ceil(filteredSVGs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredSVGs.length);

  // Get only the SVGs for current page
  const pageSVGs = filteredSVGs.slice(startIndex, endIndex);

  // Clear previous content (important for memory management)
  if (currentView === "grid") {
    const grid = document.getElementById("svgGrid");
    grid.innerHTML = ""; // Clear all previous SVGs
    renderGrid(pageSVGs);
  } else {
    const list = document.getElementById("svgList");
    list.innerHTML = ""; // Clear all previous SVGs
    renderList(pageSVGs);
  }

  // Update pagination UI
  updatePaginationUI(totalPages);

  // Scroll to top of content
  window.scrollTo({ top: 200, behavior: "smooth" });
}

function updatePaginationUI(totalPages) {
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pagination = document.getElementById("pagination");

  // Show/hide pagination
  pagination.style.display = totalPages > 1 ? "flex" : "none";

  // Update page info
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  // Update button states
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredSVGs.length / itemsPerPage);
  const newPage = currentPage + direction;

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderCurrentPage();
  }
}

function changePageSize(newSize) {
  itemsPerPage = parseInt(newSize);
  currentPage = 1; // Reset to first page
  renderCurrentPage();
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

// Modal functions
function openModal(id) {
  currentSvg = svgLibrary.find((svg) => svg.id === id);
  if (!currentSvg) return;

  document.getElementById("modalTitle").textContent = currentSvg.name;
  document.getElementById("svgModal").style.display = "flex";

  // Load current settings
  const settings = currentSvg.settings;
  document.getElementById("widthInput").value = settings.width;
  document.getElementById("heightInput").value = settings.height;
  document.getElementById("fillColorInput").value = settings.fillColor;
  document.getElementById("bgColorInput").value = settings.bgColor;
  document.getElementById("strokeColorInput").value = settings.strokeColor;
  document.getElementById("strokeWidthSlider").value = settings.strokeWidth;
  document.getElementById("strokeWidthValue").textContent =
    settings.strokeWidth;
  document.getElementById("opacitySlider").value = settings.opacity;
  document.getElementById("opacityValue").textContent = settings.opacity + "%";
  document.getElementById("rotationSlider").value = settings.rotation;
  document.getElementById("rotationValue").textContent =
    settings.rotation + "°";
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
  if (!linkedSize) return;

  const width = parseInt(document.getElementById("widthInput").value) || 100;
  const height = parseInt(document.getElementById("heightInput").value) || 100;
  const aspectRatio = currentSvg
    ? (parseInt(currentSvg.content.match(/width="(\d+)"/)?.[1]) || 100) /
      (parseInt(currentSvg.content.match(/height="(\d+)"/)?.[1]) || 100)
    : 1;

  if (e.target.id === "widthInput") {
    document.getElementById("heightInput").value = Math.round(
      width / aspectRatio
    );
  } else {
    document.getElementById("widthInput").value = Math.round(
      height * aspectRatio
    );
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

  // Parse and modify SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(currentSvg.content, "image/svg+xml");
  const svgElement = doc.querySelector("svg");

  // Set dimensions
  svgElement.setAttribute("width", width);
  svgElement.setAttribute("height", height);

  // Apply styles
  svgElement.style.backgroundColor = bgColor;
  svgElement.style.opacity = opacity;
  svgElement.style.transform = `rotate(${rotation}deg)`;
  svgElement.style.filter =
    shadow > 0
      ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0, 0, 0, 0.3))`
      : "none";

  // Update fill and stroke colors
  doc
    .querySelectorAll("path, circle, rect, ellipse, polygon, polyline")
    .forEach((el) => {
      if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", fillColor);
      }
      if (el.getAttribute("stroke") && el.getAttribute("stroke") !== "none") {
        el.setAttribute("stroke", strokeColor);
        el.setAttribute("stroke-width", strokeWidth);
      }
    });

  // Update preview
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  document.getElementById("modalSvgPreview").innerHTML = svgString;

  // Update code preview
  const formattedCode = formatSvgCode(svgString);
  document.getElementById("codePreview").textContent = formattedCode;

  // Save settings
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
  // Basic formatting for readability
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
    btn.classList.add("copied");
    btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                `;

    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    `;
    }, 2000);

    showToast("Code copied to clipboard!", "success");
  });
}

function toggleAdvanced(header) {
  const content = header.nextElementSibling;
  content.classList.toggle("active");
  const arrow = header.querySelector("svg");
  arrow.style.transform = content.classList.contains("active")
    ? "rotate(180deg)"
    : "rotate(0)";
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

// Export functionality
function exportAsCode() {
  if (svgLibrary.length === 0) {
    showToast("No SVGs to export!", "error");
    return;
  }

  // Create the array in the exact format of demoSVGs
  const svgArray = svgLibrary.map((svg) => {
    // Clean up the SVG content for better formatting
    const cleanContent = svg.content
      .replace(/\n/g, "")
      .replace(/\s+/g, " ")
      .replace(/> </g, "><")
      .trim();

    return `        {
            name: '${svg.name}',
            content: '${cleanContent}'
        }`;
  });

  // Create the complete code structure
  const code = `const demoSVGs = [
${svgArray.join(",\n")}
    ];`;

  // Create and download the file
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "svg-library-array.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${svgLibrary.length} SVGs as code!`, "success");
}

// Load demo SVGs
function loadDemoSVGs() {
  const demoSVGs = [
    {
      name: "Home",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
    },
    {
      name: "Settings",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m4.22-10.22 4.24-4.24m-4.24 12.68 4.24 4.24M20 12h-6m-6 0H2m4.22-4.22L1.98 3.54m4.24 12.68-4.24 4.24"/></svg>'
    },
    {
      name: "User",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    }
  ];

  demoSVGs.forEach((svg) => {
    addSvgToLibrary(svg.content, svg.name);
  });
}