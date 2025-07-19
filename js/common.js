// Add to common.js
export async function loadWordsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const words = e.target.result.split(/\r?\n/)
        .map(w => w.trim())
        .filter(w => w);
      resolve(words);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function showLoading(container, message = "Loading...") {
  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>${message}</p>
    </div>
  `;
}
