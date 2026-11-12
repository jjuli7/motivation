(() => {
  const IMAGE_SECONDS = 6; // duracion de cada imagen en modo AUTO
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const slide = $("slide");

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const nameOf = (url) => decodeURIComponent(url.split("/").pop()).replace(/\.[^.]+$/, "");
  const isVideo = (url) => /\.(mp4|webm|mov|m4v)$/i.test(url);

  let media = [], deck = [], pos = -1;
  let songs = [], songPos = 0;
  let auto = store.get("auto", false);
  let clipSound = store.get("clipSound", false);
  let timer = null;

  // ---------- Slides ----------
  function extendDeck() {
    let next = shuffle(media);
    // evita repetir el mismo item en el cruce entre mazos
    if (deck.length && next.length > 1 && next[0] === deck[deck.length - 1]) next.push(next.shift());
    deck = deck.concat(next);
  }

  function preload(url) {
    if (url && !isVideo(url)) { const i = new Image(); i.src = url; }
  }

  function show(i) {
    if (!media.length) return;
    while (i >= deck.length) extendDeck();
    if (i < 0) return;
    pos = i;
    const url = deck[pos];
    clearTimeout(timer);
    slide.innerHTML = "";

    const bg = document.createElement("div");
    bg.className = "bg";

    if (isVideo(url)) {
      const v = document.createElement("video");
      v.src = url;
      v.autoplay = true;
      v.playsInline = true;
      v.muted = !clipSound;
      v.loop = !auto;
      v.addEventListener("ended", () => auto && next());
      slide.append(bg, v);
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    } else {
      bg.style.backgroundImage = `url("${url}")`;
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      slide.append(bg, img);
      if (auto) timer = setTimeout(next, IMAGE_SECONDS * 1000);
    }
    updateDuck();
    $("counter").textContent = `${(pos % media.length) + 1} / ${media.length}`;
    if (pos + 1 >= deck.length) extendDeck();
    preload(deck[pos + 1]);
  }

  const next = () => show(pos + 1);
  const prev = () => show(pos - 1);

  // ---------- Musica ----------
  function playSong(i) {
    if (!songs.length) return;
    songPos = (i + songs.length) % songs.length;
    if (songPos === 0 && i >= songs.length) songs = shuffle(songs);
    audio.src = songs[songPos];
    audio.play().catch(() => {});
    $("track").textContent = "♫ " + nameOf(songs[songPos]);
  }
  audio.addEventListener("ended", () => playSong(songPos + 1));
  audio.addEventListener("error", () => songs.length > 1 && playSong(songPos + 1));
  audio.addEventListener("play", () => ($("playPause").innerHTML = "&#10074;&#10074;"));
  audio.addEventListener("pause", () => ($("playPause").innerHTML = "&#9654;"));

  function togglePlay() {
    if (!songs.length) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  }

  // baja la musica cuando un clip suena
  function updateDuck() {
    const playingClipAudio = clipSound && isVideo(deck[pos] || "");
    audio.volume = playingClipAudio ? 0.15 : 1;
  }

  // ---------- Controles ----------
  function renderToggles() {
    $("auto").classList.toggle("on", auto);
    $("clipSound").classList.toggle("on", clipSound);
    $("clipSound").innerHTML = clipSound ? "CLIP &#128266;" : "CLIP &#128263;";
  }

  function toggleAuto() {
    auto = !auto;
    store.set("auto", auto);
    renderToggles();
    show(pos);
  }

  function toggleClipSound() {
    clipSound = !clipSound;
    store.set("clipSound", clipSound);
    renderToggles();
    const v = slide.querySelector("video");
    if (v) v.muted = !clipSound;
    updateDuck();
  }

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  const bind = (id, fn) => $(id).addEventListener("click", (e) => { e.stopPropagation(); fn(); });
  bind("prevSong", () => playSong(songPos - 1));
  bind("nextSong", () => playSong(songPos + 1));
  bind("playPause", togglePlay);
  bind("auto", toggleAuto);
  bind("clipSound", toggleClipSound);
  bind("fs", toggleFs);

  // click: mitad izquierda = atras, mitad derecha = adelante
  $("stage").addEventListener("click", (e) => {
    e.clientX < window.innerWidth / 3 ? prev() : next();
  });

  // swipe
  let tx = 0, ty = 0;
  $("stage").addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  $("stage").addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); dx < 0 ? next() : prev(); }
    else if (Math.abs(dy) > 40) { e.preventDefault(); dy < 0 ? next() : prev(); }
  });

  document.addEventListener("keydown", (e) => {
    if ($("stage").hidden) return;
    const k = e.key.toLowerCase();
    if (["arrowright", "arrowdown", " ", "d", "l"].includes(k)) { e.preventDefault(); next(); }
    else if (["arrowleft", "arrowup", "h"].includes(k)) { e.preventDefault(); prev(); }
    else if (k === "m") togglePlay();
    else if (k === "e") playSong(songPos + 1);
    else if (k === "q") playSong(songPos - 1);
    else if (k === "a") toggleAuto();
    else if (k === "s") toggleClipSound();
    else if (k === "f") toggleFs();
  });

  // ---------- Inicio ----------
  async function init() {
    let manifest = { images: [], videos: [], music: [] };
    try {
      const res = await fetch("/manifest.json", { cache: "no-cache" });
      if (res.ok) manifest = await res.json();
    } catch {}
    media = [...(manifest.images || []), ...(manifest.videos || [])];
    songs = shuffle(manifest.music || []);
    $("startInfo").textContent =
      `${(manifest.images || []).length} imagenes · ${(manifest.videos || []).length} clips · ${songs.length} canciones`;
    renderToggles();
  }

  // el navegador exige un click antes de reproducir audio
  $("startBtn").addEventListener("click", () => {
    $("start").remove();
    $("stage").hidden = false;
    if (!media.length) {
      slide.innerHTML = '<p class="empty">No hay contenido. Agrega archivos en public/media/images, videos y music.</p>';
    } else {
      show(0);
    }
    playSong(0);
  });

  init();
})();
