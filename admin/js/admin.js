import { auth, db } from "../../firebase/client.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $=s=>document.querySelector(s);
let playlists=[],songs=[],requests=[],settings={};
const titles={dashboard:"Dashboard",requests:"Pedidos",playlists:"Playlists",songs:"Músicas",event:"Evento e contatos"};

function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $(`#view-${name}`).classList.add("active");
  document.querySelectorAll("#menu button").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("#viewTitle").textContent=titles[name];
  document.querySelector("aside").classList.remove("open");
}
document.querySelectorAll("#menu button").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("#menuToggle").onclick=()=>document.querySelector("aside").classList.toggle("open");

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#loginError").textContent="";
  try{await signInWithEmailAndPassword(auth,$("#loginEmail").value.trim(),$("#loginPassword").value)}
  catch(err){$("#loginError").textContent="E-mail ou senha incorretos."}
});
$("#logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{
  $("#loginScreen").hidden=!!user;$("#adminApp").hidden=!user;
  if(user){$("#userEmail").textContent=user.email;startListeners();loadSettings()}
});

let unsubs=[];
function startListeners(){
  unsubs.forEach(fn=>fn());unsubs=[];
  unsubs.push(onSnapshot(collection(db,"playlists"),snap=>{playlists=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
  unsubs.push(onSnapshot(collection(db,"songs"),snap=>{songs=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
  unsubs.push(onSnapshot(query(collection(db,"requests"),orderBy("createdAt","desc")),snap=>{requests=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
}
async function loadSettings(){
  const snap=await getDoc(doc(db,"settings","public"));
  settings=snap.exists()?snap.data():{};
  ["eventName","requestWhatsapp","hireWhatsapp","pixKey","introText","instagram","youtube","spotify","site"].forEach(id=>$("#"+id).value=settings[id]||"");
  $("#pixEnabled").checked=settings.pixEnabled!==false;
  renderDashboard();
}
function renderAll(){renderDashboard();renderPlaylists();renderSongs();renderRequests();fillPlaylistOptions();fillNowPlaying()}
function renderDashboard(){
  $("#newRequestsCount").textContent=requests.filter(r=>r.status==="new").length;
  $("#activePlaylistsCount").textContent=playlists.filter(p=>p.active).length;
  $("#songsCount").textContent=songs.length;
  $("#dashboardEvent").textContent=settings.eventName||"Não definido";
}
function renderPlaylists(){
  const sorted=[...playlists].sort((a,b)=>(a.order||0)-(b.order||0));
  $("#playlistsAdmin").innerHTML=sorted.length?`<table><thead><tr><th>Playlist</th><th>Músicas</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead><tbody>${sorted.map(p=>`<tr>
    <td>${esc(p.icon||"🎵")} <strong>${esc(p.name)}</strong></td>
    <td>${songs.filter(s=>s.playlistId===p.id).length}</td><td>${p.order||0}</td>
    <td><span class="badge ${p.active?"on":""}">${p.active?"Ativa":"Oculta"}</span></td>
    <td class="actions"><button data-edit-playlist="${p.id}">Editar</button><button data-toggle-playlist="${p.id}">${p.active?"Ocultar":"Ativar"}</button><button data-delete-playlist="${p.id}">Excluir</button></td>
  </tr>`).join("")}</tbody></table>`:`<p style="padding:20px" class="hint">Nenhuma playlist cadastrada.</p>`;
  document.querySelectorAll("[data-edit-playlist]").forEach(b=>b.onclick=()=>openPlaylist(b.dataset.editPlaylist));
  document.querySelectorAll("[data-toggle-playlist]").forEach(b=>b.onclick=()=>updateDoc(doc(db,"playlists",b.dataset.togglePlaylist),{active:!playlists.find(p=>p.id===b.dataset.togglePlaylist).active}));
  document.querySelectorAll("[data-delete-playlist]").forEach(b=>b.onclick=async()=>{if(confirm("Excluir esta playlist? As músicas associadas não serão apagadas."))await deleteDoc(doc(db,"playlists",b.dataset.deletePlaylist))});
}
function openPlaylist(id=""){
  const p=playlists.find(x=>x.id===id);
  $("#playlistDialogTitle").textContent=p?"Editar playlist":"Nova playlist";$("#playlistId").value=id;
  $("#playlistName").value=p?.name||"";$("#playlistIcon").value=p?.icon||"🎵";$("#playlistOrder").value=p?.order||playlists.length+1;$("#playlistActive").checked=p?.active??true;
  $("#playlistDialog").showModal();
}
$("#newPlaylistBtn").onclick=()=>openPlaylist();
$("#playlistForm").addEventListener("submit",async e=>{
  e.preventDefault();const id=$("#playlistId").value;const data={name:$("#playlistName").value.trim(),icon:$("#playlistIcon").value.trim()||"🎵",order:Number($("#playlistOrder").value)||0,active:$("#playlistActive").checked,updatedAt:serverTimestamp()};
  if(id)await updateDoc(doc(db,"playlists",id),data);else await addDoc(collection(db,"playlists"),{...data,createdAt:serverTimestamp()});
  $("#playlistDialog").close();toast("Playlist salva.");
});

function renderSongs(){
  const term=$("#songAdminSearch").value.toLowerCase();
  const list=[...songs].filter(s=>`${s.title} ${s.artist||""}`.toLowerCase().includes(term)).sort((a,b)=>a.title.localeCompare(b.title,"pt-BR"));
  $("#songsAdmin").innerHTML=list.length?`<table><thead><tr><th>Música</th><th>Artista</th><th>Playlist</th><th>Pedidos</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(s=>`<tr>
    <td><strong>${esc(s.title)}</strong></td><td>${esc(s.artist||"")}</td><td>${esc(playlists.find(p=>p.id===s.playlistId)?.name||"Sem playlist")}</td><td>${s.requestCount||0}</td>
    <td><span class="badge ${s.active!==false?"on":""}">${s.active!==false?"Disponível":"Oculta"}</span></td>
    <td class="actions"><button data-edit-song="${s.id}">Editar</button><button data-delete-song="${s.id}">Excluir</button></td>
  </tr>`).join("")}</tbody></table>`:`<p style="padding:20px" class="hint">Nenhuma música cadastrada.</p>`;
  document.querySelectorAll("[data-edit-song]").forEach(b=>b.onclick=()=>openSong(b.dataset.editSong));
  document.querySelectorAll("[data-delete-song]").forEach(b=>b.onclick=async()=>{if(confirm("Excluir esta música?"))await deleteDoc(doc(db,"songs",b.dataset.deleteSong))});
}
$("#songAdminSearch").addEventListener("input",renderSongs);
function fillPlaylistOptions(){
  $("#songPlaylist").innerHTML=playlists.sort((a,b)=>(a.order||0)-(b.order||0)).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
}
function openSong(id=""){
  if(!playlists.length)return toast("Crie uma playlist primeiro.");
  const s=songs.find(x=>x.id===id);$("#songDialogTitle").textContent=s?"Editar música":"Nova música";$("#songId").value=id;
  $("#songTitle").value=s?.title||"";$("#songArtist").value=s?.artist||"";$("#songPlaylist").value=s?.playlistId||playlists[0].id;$("#songActive").checked=s?.active??true;
  $("#songDialog").showModal();
}
$("#newSongBtn").onclick=()=>openSong();
$("#songForm").addEventListener("submit",async e=>{
  e.preventDefault();const id=$("#songId").value;const data={title:$("#songTitle").value.trim(),artist:$("#songArtist").value.trim(),playlistId:$("#songPlaylist").value,active:$("#songActive").checked,updatedAt:serverTimestamp()};
  if(id)await updateDoc(doc(db,"songs",id),data);else await addDoc(collection(db,"songs"),{...data,requestCount:0,createdAt:serverTimestamp()});
  $("#songDialog").close();toast("Música salva.");
});

function renderRequests(){
  const filter=$("#requestFilter").value;
  const list=requests.filter(r=>filter==="all"||r.status===filter);
  $("#requestsList").innerHTML=list.length?list.map(r=>`<article class="request-card">
    <div><h3>${esc(r.title)} <small>— ${esc(r.artist||"")}</small></h3><p><strong>${esc(r.customerName||"Anônimo")}</strong>${r.table?` · Mesa ${esc(r.table)}`:""}</p>${r.dedication?`<p>“${esc(r.dedication)}”</p>`:""}<span class="badge">${esc(r.status||"new")}</span></div>
    <div class="request-actions"><button class="status-btn accept" data-status="${r.id}:accepted">Aceitar</button><button class="status-btn" data-play="${r.id}">Tocando</button><button class="status-btn" data-status="${r.id}:played">Tocada</button><button class="status-btn decline" data-status="${r.id}:declined">Recusar</button></div>
  </article>`).join(""):`<p class="hint">Nenhum pedido encontrado.</p>`;
  document.querySelectorAll("[data-status]").forEach(b=>b.onclick=()=>{const [id,status]=b.dataset.status.split(":");updateDoc(doc(db,"requests",id),{status,updatedAt:serverTimestamp()})});
  document.querySelectorAll("[data-play]").forEach(b=>b.onclick=async()=>{const r=requests.find(x=>x.id===b.dataset.play);await setDoc(doc(db,"live","nowPlaying"),{title:r.title,artist:r.artist||"",songId:r.songId||"",updatedAt:serverTimestamp()});await updateDoc(doc(db,"requests",r.id),{status:"accepted"});toast("Agora tocando atualizado.")});
}
$("#requestFilter").addEventListener("change",renderRequests);

$("#settingsForm").addEventListener("submit",async e=>{
  e.preventDefault();
  settings={eventName:$("#eventName").value.trim(),requestWhatsapp:$("#requestWhatsapp").value.trim(),hireWhatsapp:$("#hireWhatsapp").value.trim(),pixKey:$("#pixKey").value.trim(),pixEnabled:$("#pixEnabled").checked,introText:$("#introText").value.trim(),instagram:$("#instagram").value.trim(),youtube:$("#youtube").value.trim(),spotify:$("#spotify").value.trim(),site:$("#site").value.trim(),updatedAt:serverTimestamp()};
  await setDoc(doc(db,"settings","public"),settings,{merge:true});renderDashboard();toast("Configurações salvas.");
});

function fillNowPlaying(){
  const options=[...songs].sort((a,b)=>a.title.localeCompare(b.title,"pt-BR")).map(s=>`<option value="${s.id}">${esc(s.title)} — ${esc(s.artist||"")}</option>`).join("");
  $("#nowPlayingSelect").innerHTML=`<option value="">Selecione uma música</option>${options}`;
}
$("#setNowPlaying").onclick=async()=>{const s=songs.find(x=>x.id===$("#nowPlayingSelect").value);if(!s)return toast("Selecione uma música.");await setDoc(doc(db,"live","nowPlaying"),{title:s.title,artist:s.artist||"",songId:s.id,updatedAt:serverTimestamp()});toast("Agora tocando atualizado.")};
$("#clearNowPlaying").onclick=async()=>{await setDoc(doc(db,"live","nowPlaying"),{title:"",artist:"",songId:"",updatedAt:serverTimestamp()});toast("Agora tocando removido.")};

$("#seedBtn").onclick=async()=>{
  if(!confirm("Criar os dados iniciais? Use apenas na primeira configuração."))return;
  $("#seedStatus").textContent="Criando dados...";
  const batch=writeBatch(db);
  batch.set(doc(db,"settings","public"),{
    eventName:"Show de Ailton Souza",introText:"Escolha uma playlist, encontre sua música favorita e envie seu pedido.",
    requestWhatsapp:"556195840847",hireWhatsapp:"556195840847",pixEnabled:true,pixKey:"82fe4a23-b9d7-4517-b5b1-dfcfea64a201",
    instagram:"https://instagram.com/cantorailtonsouza",youtube:"https://youtube.com/@ailtonsouza",spotify:"https://open.spotify.com/",site:"https://cantorailtonsouza.github.io/",updatedAt:serverTimestamp()
  },{merge:true});
  const playlistData=[
    {id:"sertanejo-atual",name:"Sertanejo Atual",icon:"🔥",order:1,active:true},
    {id:"modao",name:"Modão",icon:"🤠",order:2,active:true},
    {id:"baile",name:"Forró e Bailão",icon:"💃",order:3,active:true}
  ];
  playlistData.forEach(p=>batch.set(doc(db,"playlists",p.id),{name:p.name,icon:p.icon,order:p.order,active:p.active,createdAt:serverTimestamp()}));
  const seedSongs=[
    ["erro-gostoso","Erro Gostoso","Simone Mendes","sertanejo-atual"],
    ["ultima-saudade","Última Saudade","Henrique & Juliano","sertanejo-atual"],
    ["te-seguro","Te Seguro","Panda","sertanejo-atual"],
    ["pagina-de-amigos","Página de Amigos","Chitãozinho & Xororó","modao"],
    ["convite-de-casamento","Convite de Casamento","Gian & Giovani","modao"],
    ["tentei-te-esquecer","Tentei Te Esquecer","Matogrosso & Mathias","modao"],
    ["panela-velha","Panela Velha","Sérgio Reis","baile"],
    ["vida-boa","Vida Boa","Victor & Leo","baile"],
    ["esquema-preferido","Esquema Preferido","Os Barões da Pisadinha","baile"]
  ];
  seedSongs.forEach(([id,title,artist,playlistId])=>batch.set(doc(db,"songs",id),{title,artist,playlistId,active:true,requestCount:0,createdAt:serverTimestamp()}));
  try{await batch.commit();$("#seedStatus").textContent="Dados iniciais criados com sucesso.";toast("Dados iniciais criados.");}catch(err){console.error(err);$("#seedStatus").textContent="Erro ao criar dados. Confira as regras do Firestore."}
};
