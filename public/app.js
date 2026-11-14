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
  let songs = [];
  let auto = store.get("auto", false);
  let clipSound = store.get("clipSound", false);
  let timer = null;
  let showToken = 0;

  // ---------- Slides ----------
  function extendDeck() {
    let next = shuffle(media);
    // evita repetir el mismo item en el cruce entre mazos
    if (deck.length && next.length > 1 && next[0] === deck[deck.length - 1]) next.push(next.shift());
    deck = deck.concat(next);
  }

  function preload(url) {
    if (url && !isVideo(url)) { const i = new Image(); i.src = url; i.decode?.().catch(() => {}); }
  }

  function show(i) {
    if (!media.length) return;
    while (i >= deck.length) extendDeck();
    if (i < 0) return;
    pos = i;
    const url = deck[pos];
    clearTimeout(timer);
    const token = ++showToken;

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
      slide.replaceChildren(bg, v);
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    } else {
      bg.style.backgroundImage = `url("${url}")`;
      const img = document.createElement("img");
      img.decoding = "async";
      img.alt = "";
      img.src = url;
      // cambia solo cuando la imagen esta decodificada: sin parpadeo negro
      img.decode().catch(() => {}).then(() => {
        if (token !== showToken) return;
        slide.replaceChildren(bg, img);
        if (auto) timer = setTimeout(next, IMAGE_SECONDS * 1000);
      });
    }
    updateDuck();
    $("counter").textContent = `${(pos % media.length) + 1} / ${media.length}`;
    if (pos + 1 >= deck.length) extendDeck();
    preload(deck[pos + 1]);
  }

  const next = () => show(pos + 1);
  const prev = () => show(pos - 1);

  // ---------- Musica ----------
  let history = [], hpos = -1;
  let volume = store.get("volume", 0.8);

  function loadSong(url) {
    audio.src = url;
    audio.play().catch(() => {});
    $("track").textContent = "\u266B " + nameOf(url);
  }

  // siguiente cancion aleatoria (evita repetir las ultimas escuchadas)
  function nextSong() {
    if (!songs.length) return;
    if (hpos < history.length - 1) return loadSong(history[++hpos]);
    const recent = history.slice(-Math.min(Math.floor(songs.length / 2), 5));
    const pool = songs.filter((s) => !recent.includes(s));
    const pick = (pool.length ? pool : songs)[Math.floor(Math.random() * (pool.length || songs.length))];
    history.push(pick);
    hpos = history.length - 1;
    loadSong(pick);
  }

  function prevSong() {
    if (!songs.length) return;
    if (audio.currentTime > 3 || hpos <= 0) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    loadSong(history[--hpos]);
  }

  audio.addEventListener("ended", nextSong);
  audio.addEventListener("error", () => songs.length > 1 && nextSong());
  audio.addEventListener("play", () => ($("playPause").innerHTML = "&#10074;&#10074;"));
  audio.addEventListener("pause", () => ($("playPause").innerHTML = "&#9654;"));

  function togglePlay() {
    if (!songs.length) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  }

  // volumen; baja la musica cuando un clip suena
  function updateDuck() {
    const playingClipAudio = clipSound && isVideo(deck[pos] || "");
    audio.volume = volume * (playingClipAudio ? 0.2 : 1);
    const v = slide.querySelector("video");
    if (v) v.volume = Math.max(volume, 0.3);
  }

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    store.set("volume", volume);
    $("volume").value = Math.round(volume * 100);
    $("volIcon").innerHTML = volume === 0 ? "&#128263;" : volume < 0.5 ? "&#128265;" : "&#128266;";
    updateDuck();
  }

  let lastVol = volume || 0.8;
  function toggleMute() {
    if (volume > 0) { lastVol = volume; setVolume(0); } else setVolume(lastVol || 0.8);
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
  bind("prevSong", prevSong);
  bind("nextSong", nextSong);
  bind("volIcon", toggleMute);
  $("volume").addEventListener("input", (e) => setVolume(e.target.value / 100));
  $("volume").addEventListener("click", (e) => e.stopPropagation());
  ["touchstart", "touchend"].forEach((t) => $("hud").addEventListener(t, (e) => e.stopPropagation()));
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
    else if (k === "e" || k === "n") nextSong();
    else if (k === "q") prevSong();
    else if (k === "+" || k === "=") setVolume(volume + 0.1);
    else if (k === "-") setVolume(volume - 0.1);
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
    setVolume(volume);
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
    nextSong();
  });

  init();
})();
