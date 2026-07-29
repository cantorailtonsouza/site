import { db } from "../firebase/client.js";
import {
  collection, doc, getDoc, onSnapshot, query, where, addDoc,
  serverTimestamp, increment, updateDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const defaults = {
  eventName: "Show de Ailton Souza",
  introText: "Escolha uma playlist, encontre sua música favorita e envie seu pedido.",
  requestWhatsapp: "556195840847",
  hireWhatsapp: "556195840847",
  pixEnabled: true,
  pixKey: "82fe4a23-b9d7-4517-b5b1-dfcfea64a201",
  instagram: "https://instagram.com/cantorailtonsouza",
  youtube: "https://youtube.com/@ailtonsouza",
  spotify: "https://open.spotify.com/",
  site: "https://cantorailtonsouza.github.io/"
};

let config = {...defaults};
let playlists = [];
let songs = [];
let selectedPlaylist = null;
let selectedSong = null;

const $ = (s) => document.querySelector(s);
const playlistGrid = $("#playlistGrid");
const songList = $("#songList");
const requestDialog = $("#requestDialog");

function toast(message){
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 2600);
}
function normalizePhone(value=""){ return value.replace(/\D/g,""); }
function escapeHtml(value=""){ return value.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }

async function loadConfig(){
  try{
    const snap = await getDoc(doc(db,"settings","public"));
    if(snap.exists()) config = {...defaults,...snap.data()};
  }catch(e){ console.warn("Configuração padrão em uso.", e); }
  $("#eventBadge").textContent = config.eventName || "AO VIVO";
  $("#introText").textContent = config.introText || defaults.introText;
  $("#instagramLink").href = config.instagram || defaults.instagram;
  $("#youtubeLink").href = config.youtube || defaults.youtube;
  $("#spotifyLink").href = config.spotify || defaults.spotify;
  $("#siteLink").href = config.site || defaults.site;
  $("#hireBtn").href = `https://wa.me/${normalizePhone(config.hireWhatsapp)}?text=${encodeURIComponent("Olá! Gostaria de solicitar um orçamento para um show do Ailton Souza.")}`;
  $("#pixBtn").hidden = !config.pixEnabled;
}

function listenData(){
  onSnapshot(query(collection(db,"playlists"), where("active","==",true)), snap=>{
    playlists = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
    renderPlaylists();
  }, err=>{ playlistGrid.innerHTML = `<p class="muted">Não foi possível carregar as playlists.</p>`; console.error(err); });

  onSnapshot(collection(db,"songs"), snap=>{
    songs = snap.docs.map(d=>({id:d.id,...d.data()}));
    if(selectedPlaylist) renderSongs();
    renderTopSongs();
  });

  onSnapshot(doc(db,"live","nowPlaying"), snap=>{
    const box=$("#nowPlayingBox");
    if(snap.exists() && snap.data().title){
      $("#nowPlayingTitle").textContent = `${snap.data().title}${snap.data().artist ? " — "+snap.data().artist : ""}`;
      box.hidden=false;
    } else box.hidden=true;
  });
}

function renderPlaylists(){
  if(!playlists.length){
    playlistGrid.innerHTML = `<p class="muted">As playlists serão disponibilizadas em breve.</p>`;
    return;
  }
  playlistGrid.innerHTML = playlists.map(p=>{
    const count=songs.filter(s=>s.playlistId===p.id && s.active!==false).length;
    return `<article class="playlist-card" data-id="${p.id}">
      <span class="playlist-icon">${escapeHtml(p.icon||"🎵")}</span>
      <div><h3>${escapeHtml(p.name)}</h3><p>${count} ${count===1?"música":"músicas"}</p></div>
    </article>`;
  }).join("");
  playlistGrid.querySelectorAll(".playlist-card").forEach(card=>card.onclick=()=>openPlaylist(card.dataset.id));
}

function openPlaylist(id){
  selectedPlaylist=playlists.find(p=>p.id===id);
  if(!selectedPlaylist)return;
  $("#playlistTitle").textContent=selectedPlaylist.name;
  $("#songsSection").hidden=false;
  $("#playlists").hidden=true;
  $("#topSection").hidden=true;
  $("#songSearch").value="";
  renderSongs();
  $("#songsSection").scrollIntoView({behavior:"smooth"});
}
function renderSongs(){
  const term=$("#songSearch").value.trim().toLowerCase();
  const list=songs.filter(s=>s.playlistId===selectedPlaylist?.id && s.active!==false)
    .filter(s=>`${s.title} ${s.artist||""}`.toLowerCase().includes(term))
    .sort((a,b)=>a.title.localeCompare(b.title,"pt-BR"));
  songList.innerHTML=list.length?list.map(s=>`<article class="song-row">
    <div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.artist||"")}</p></div>
    <button class="request-btn" data-id="${s.id}">Pedir música</button>
  </article>`).join(""):`<p class="muted">Nenhuma música encontrada.</p>`;
  songList.querySelectorAll(".request-btn").forEach(btn=>btn.onclick=()=>openRequest(btn.dataset.id));
}

function renderTopSongs(){
  const top=[...songs].filter(s=>s.active!==false && (s.requestCount||0)>0)
    .sort((a,b)=>(b.requestCount||0)-(a.requestCount||0)).slice(0,5);
  $("#topSongs").innerHTML = top.length ? top.map((s,i)=>`<article class="rank"><b>#${i+1}</b><strong>${escapeHtml(s.title)}</strong><small>${escapeHtml(s.artist||"")}</small></article>`).join("")
  : `<p class="muted">O ranking aparecerá conforme os pedidos forem enviados.</p>`;
}

function openRequest(id){
  selectedSong=songs.find(s=>s.id===id); if(!selectedSong)return;
  $("#selectedSong").textContent=selectedSong.title;
  $("#selectedArtist").textContent=selectedSong.artist||"";
  requestDialog.showModal();
}
$("#requestForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const name=$("#customerName").value.trim();
  if(!name)return;
  const table=$("#customerTable").value.trim();
  const dedication=$("#dedication").value.trim();
  const payload={
    songId:selectedSong.id, title:selectedSong.title, artist:selectedSong.artist||"",
    playlistId:selectedSong.playlistId, customerName:name, table, dedication,
    eventName:config.eventName||"", status:"new", createdAt:serverTimestamp()
  };
  try{
    await addDoc(collection(db,"requests"),payload);
    await updateDoc(doc(db,"songs",selectedSong.id),{requestCount:increment(1)});
  }catch(err){ console.error(err); toast("O pedido será enviado pelo WhatsApp."); }
  const msg=[
    "🎵 *Novo pedido — Toca Ailton Souza*",
    config.eventName?`📍 Evento: ${config.eventName}`:"",
    `🎶 Música: ${selectedSong.title}`,
    selectedSong.artist?`🎤 Artista: ${selectedSong.artist}`:"",
    `👤 Nome: ${name}`,
    table?`🪑 Mesa: ${table}`:"",
    dedication?`💬 Dedicatória: ${dedication}`:""
  ].filter(Boolean).join("\n");
  requestDialog.close();
  $("#requestForm").reset();
  window.open(`https://wa.me/${normalizePhone(config.requestWhatsapp)}?text=${encodeURIComponent(msg)}`,"_blank","noopener");
});

$("#backBtn").onclick=()=>{selectedPlaylist=null;$("#songsSection").hidden=true;$("#playlists").hidden=false;$("#topSection").hidden=false;$("#playlists").scrollIntoView({behavior:"smooth"});};
$("#songSearch").addEventListener("input",renderSongs);
$("#surpriseBtn").onclick=()=>{
  const active=songs.filter(s=>s.active!==false && playlists.some(p=>p.id===s.playlistId));
  if(!active.length)return toast("Ainda não há músicas disponíveis.");
  const song=active[Math.floor(Math.random()*active.length)];
  selectedSong=song;$("#selectedSong").textContent=song.title;$("#selectedArtist").textContent=song.artist||"";requestDialog.showModal();
};
$("#pixBtn").onclick=async()=>{try{await navigator.clipboard.writeText(config.pixKey);toast("Chave Pix copiada!");}catch{prompt("Copie a chave Pix:",config.pixKey)}};

await loadConfig();
listenData();
