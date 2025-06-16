const imageInput = document.getElementById('imageInput');
const translateBtn = document.getElementById('translateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const imagesPreview = document.getElementById('imagesPreview');

let images = [];

imageInput.addEventListener('change', (e) => {
  images = Array.from(e.target.files);
  renderImages();
});

function renderImages() {
  imagesPreview.innerHTML = '';
  images.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const div = document.createElement('div');
      div.className = 'image-box';
      div.innerHTML = `
        <img src="${ev.target.result}" alt="img${idx}">
        <div class="translated-text" id="trans${idx}"></div>
      `;
      imagesPreview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// ترجمة نص الصورة باستخدام Tesseract.js + ترجمة Google Translate API المجانية عبر fetch
async function translateImageText(imageFile, idx) {
  const imgUrl = URL.createObjectURL(imageFile);
  const { data: { text } } = await Tesseract.recognize(imgUrl, 'eng+ara+jpn');
  // ترجمة النص تلقائيًا
  const translated = await translateText(text, "ar");
  document.getElementById(`trans${idx}`).innerText = translated;
  URL.revokeObjectURL(imgUrl);
  return translated;
}

// ترجمة النص إلى العربية باستخدام Google Translate API غير رسمية (fetch)
async function translateText(text, targetLang = "ar") {
  if (!text.trim()) return '';
  // استخدام API مجاني بدون مفتاح
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(t => t[0]).join('');
  } catch {
    return "خطأ في الترجمة";
  }
}

// ترجمة جميع الصور دفعة واحدة
translateBtn.addEventListener('click', async () => {
  for (let i = 0; i < images.length; i++) {
    document.getElementById(`trans${i}`).innerText = "جارٍ التعرف والترجمة...";
    await translateImageText(images[i], i);
  }
});

// تحميل جميع الصور المترجمة بصيغة ملف مضغوط ZIP
downloadBtn.addEventListener('click', async () => {
  if (images.length == 0) return alert("أضف صور أولاً!");
  const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  const zip = new JSZip.default();
  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const reader = new FileReader();
    const translated = document.getElementById(`trans${i}`).innerText || "";
    await new Promise(resolve => {
      reader.onload = function(ev) {
        // حفظ الصورة الأصلية مع الترجمة في ملف نصي جانبي
        zip.file(`image_${i+1}.jpg`, ev.target.result.split(',')[1], {base64: true});
        zip.file(`image_${i+1}_translation.txt`, translated);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }
  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "translated_images.zip";
  a.click();
});
