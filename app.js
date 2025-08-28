/* Controle Financeiro PWA — categorias e subcategorias editáveis
  - Transações: {id, date, desc, category, subcategory|null, type, value}
  - Categorias: { name: string, subcats: string[] }
  - Gráfico: soma por category (ignora subcategory)
  - Persistência: localStorage
  - Migração: lê chaves antigas (v1) se existirem
*/

const $ = (id)=>document.getElementById(id);
const LS_FIN_V2 = "pwa_fin_rows_v2";
const LS_CAT_V2 = "pwa_fin_cats_v2";
const LS_FIN_V1 = "pwa_fin_rows_v1";   // migração
const LS_CAT_V1 = "pwa_fin_cats_v1";

const DEFAULT_CATS = [
  {name:"Alimentação", subcats:["Mercado","Restaurante","Delivery"]},
  {name:"Moradia", subcats:["Aluguel","Luz","Água","Internet"]},
  {name:"Transporte", subcats:["Combustível","Ônibus","App"]},
  {name:"Lazer", subcats:[]},
  {name:"Contas", subcats:["Bancos","Tarifas"]},
  {name:"Saúde", subcats:["Farmácia","Consultas"]},
  {name:"Educação", subcats:[]},
  {name:"Outros", subcats:[]}
];

let fin = readFin();
let cats = readCats();

/* ---------- Storage & Migration ---------- */
function readFin(){
  const v2 = localStorage.getItem(LS_FIN_V2);
  if(v2) return JSON.parse(v2);
  const v1 = localStorage.getItem(LS_FIN_V1);
  if(v1){
    try{
      const rows = JSON.parse(v1);
      // Mapear para v2 (sem subcategory inicialmente)
      const mapped = rows.map((r,i)=>({
        id: r.id ?? i+1,
        date: r.date || new Date().toISOString().slice(0,10),
        desc: r.desc || r.description || "",
        category: r.cat || r.category || "Outros",
        subcategory: r.subcategory || null,
        type: r.type || "Saída",
        value: Number(r.value || r.val || 0)
      }));
      localStorage.setItem(LS_FIN_V2, JSON.stringify(mapped));
      return mapped;
    }catch(e){ return []; }
  }
  return [];
}
function readCats(){
  const v2 = localStorage.getItem(LS_CAT_V2);
  if(v2) return JSON.parse(v2);
  const v1 = localStorage.getItem(LS_CAT_V1);
  if(v1){
    try{
      const arr = JSON.parse(v1); // era um array de strings
      const mapped = (Array.isArray(arr)?arr:[]).map(n=>({name:n, subcats:[]}));
      localStorage.setItem(LS_CAT_V2, JSON.stringify(mapped));
      return mapped;
    }catch(e){ /* ignore */ }
  }
  localStorage.setItem(LS_CAT_V2, JSON.stringify(DEFAULT_CATS));
  return JSON.parse(localStorage.getItem(LS_CAT_V2));
}
function saveAll(){
  localStorage.setItem(LS_FIN_V2, JSON.stringify(fin));
  localStorage.setItem(LS_CAT_V2, JSON.stringify(cats));
}

/* ---------- UI Helpers ---------- */
function fmt(n){ return "R$ " + Number(n||0).toFixed(2).replace(".",","); }
function setToday(id){ $(id).value = new Date().toISOString().slice(0,10); }
function openTab(tab){
  document.querySelectorAll(".tab").forEach(el=>el.classList.toggle("active", el.dataset.tab===tab));
  document.querySelectorAll("main section").forEach(s=>s.classList.add("hidden"));
  $(tab).classList.remove("hidden");
}

/* ---------- Category + Subcategory selects ---------- */
function refreshCategorySelect(){
  const sel = $("f-cat"); sel.innerHTML = "";
  cats.forEach(c=>{
    const o = document.createElement("option");
    o.value = c.name; o.textContent = c.name; sel.appendChild(o);
  });
  if(!cats.find(c=>c.name===sel.value) && cats[0]) sel.value = cats[0].name;
  refreshSubcategorySelect();
}
function refreshSubcategorySelect(){
  const catName = $("f-cat").value;
  const cat = cats.find(c=>c.name===catName);
  const sel = $("f-subcat"); sel.innerHTML = "";
  const opt0 = document.createElement("option"); opt0.value=""; opt0.textContent="(sem subcategoria)"; sel.appendChild(opt0);
  (cat?.subcats||[]).forEach(sc=>{
    const o=document.createElement("option"); o.value=sc; o.textContent=sc; sel.appendChild(o);
  });
}

/* ---------- Add / Remove Transactions ---------- */
function addFin(){
  const row = {
    id: Date.now(),
    date: $("f-date").value || new Date().toISOString().slice(0,10),
    desc: $("f-desc").value.trim(),
    category: $("f-cat").value,
    subcategory: $("f-subcat").value || null,
    type: $("f-type").value,
    value: Number($("f-val").value || 0)
  };
  if(!row.category) return alert("Selecione uma categoria.");
  if(!row.value) return alert("Informe um valor.");
  fin.push(row);
  saveAll();
  $("f-desc").value=""; $("f-val").value="";
  renderFin();
}
function removeFin(id){
  if(!confirm("Remover este lançamento?")) return;
  fin = fin.filter(r=>r.id!==id);
  saveAll();
  renderFin();
}

/* ---------- Render Finance ---------- */
let relCatPie = null, relSubPie = null;
function renderFin(){
  const entradas = fin.filter(r=>r.type==="Entrada").reduce((a,b)=>a+b.value,0);
  const saidas   = fin.filter(r=>r.type==="Saída").reduce((a,b)=>a+b.value,0);
  $("total-entr").textContent = fmt(entradas);
  $("total-sai").textContent  = fmt(saidas);
  $("total-saldo").textContent= fmt(entradas-saidas);

  // tabela da aba Finanças
  const container = $("fin-table"); container.innerHTML="";
  if(fin.length===0){ container.innerHTML="<div class='small'>Sem lançamentos.</div>"; }
  else{
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Data</th><th>Desc</th><th>Categoria</th><th>Subcat</th><th>Tipo</th><th>Valor</th><th></th></tr></thead>";
    const tbody = document.createElement("tbody");
    fin.slice().reverse().forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.date}</td><td>${escapeHtml(r.desc)}</td><td>${escapeHtml(r.category)}</td><td>${r.subcategory?escapeHtml(r.subcategory):"-"}</td><td>${r.type}</td><td>${fmt(r.value)}</td>`;
      const td = document.createElement("td");
      const del = document.createElement("button"); del.textContent="Excluir"; del.className="btn warn";
      del.onclick=()=>removeFin(r.id);
      td.appendChild(del); tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  renderRelatorios(); // sempre atualizar relatórios junto
}

/* ---------- Category Manager Modal ---------- */
function openCatModal(){ $("cat-modal").classList.add("show"); renderCatManager(); }
function closeCatModal(){ $("cat-modal").classList.remove("show"); }
function renderCatManager(){
  const box = $("cat-list"); box.innerHTML="";
  cats.forEach((c, idx)=>{
    const wrap = document.createElement("div");
    wrap.className="card"; wrap.style.marginBottom="8px";
    const title = document.createElement("div");
    title.style.display="flex"; title.style.justifyContent="space-between"; title.style.alignItems="center";

    const nameInput = document.createElement("input");
    nameInput.value = c.name; nameInput.style.maxWidth="280px";
    nameInput.onchange = ()=>{
      const oldName = c.name;
      c.name = nameInput.value.trim() || c.name;
      // atualizar transações que usam a categoria
      fin.forEach(r=>{ if(r.category===oldName) r.category=c.name; });
      saveAll(); refreshCategorySelect(); renderFin();
    };

    const delBtn = document.createElement("button");
    delBtn.className="btn warn"; delBtn.textContent="Excluir";
    delBtn.onclick = ()=>{
      if(!confirm("Excluir categoria e mover lançamentos para 'Outros'?")) return;
      const oldName = c.name;
      // mover transações
      fin.forEach(r=>{ if(r.category===oldName) r.category="Outros"; });
      // remover categoria
      cats.splice(idx,1);
      // garantir 'Outros' exista
      if(!cats.find(x=>x.name==="Outros")) cats.push({name:"Outros", subcats:[]});
      saveAll(); refreshCategorySelect(); renderCatManager(); renderFin();
    };

    title.appendChild(nameInput); title.appendChild(delBtn);
    wrap.appendChild(title);

    // Subcats pills
    const pills = document.createElement("div"); pills.style.marginTop="8px";
    c.subcats.forEach((sc,sidx)=>{
      const pill = document.createElement("span"); pill.className="pill";
      pill.textContent = sc + " ";
      const edit = document.createElement("button"); edit.textContent="✏️";
      edit.onclick = ()=>{
        const nv = prompt("Renomear subcategoria:", sc);
        if(!nv) return;
        // atualizar transações
        fin.forEach(r=>{ if(r.category===c.name && r.subcategory===sc) r.subcategory=nv; });
        c.subcats[sidx]=nv; saveAll(); renderCatManager(); refreshSubcategorySelect(); renderFin();
      };
      const remove = document.createElement("button"); remove.textContent="✖";
      remove.onclick = ()=>{
        if(!confirm("Remover subcategoria? (Lançamentos ficam sem subcategoria)")) return;
        fin.forEach(r=>{ if(r.category===c.name && r.subcategory===sc) r.subcategory=null; });
        c.subcats.splice(sidx,1); saveAll(); renderCatManager(); refreshSubcategorySelect(); renderFin();
      };
      pill.appendChild(edit); pill.appendChild(remove); pills.appendChild(pill);
    });
    wrap.appendChild(pills);

    // Add subcat
    const row = document.createElement("div"); row.style.display="flex"; row.style.gap="8px"; row.style.marginTop="8px";
    const input = document.createElement("input"); input.placeholder="Nova subcategoria";
    const addBtn = document.createElement("button"); addBtn.className="btn"; addBtn.textContent="Adicionar subcategoria";
    addBtn.onclick = ()=>{
      const name = input.value.trim(); if(!name) return;
      if(!c.subcats.includes(name)) c.subcats.push(name);
      input.value=""; saveAll(); renderCatManager(); if($("f-cat").value===c.name) refreshSubcategorySelect();
    };
    row.appendChild(input); row.appendChild(addBtn); wrap.appendChild(row);

    box.appendChild(wrap);
  });
}

function addCategory(){
  const name = $("new-cat-name").value.trim();
  if(!name) return;
  if(cats.find(c=>c.name===name)) return alert("Já existe uma categoria com esse nome.");
  cats.push({name, subcats:[]});
  $("new-cat-name").value="";
  saveAll(); refreshCategorySelect(); renderCatManager();
}

/* ---------- Backup / Restore ---------- */
function exportJson(){
  const data = { fin, cats };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup_financeiro.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function triggerImport(){ $("import-json").click(); }
function handleImport(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const data = JSON.parse(r.result);
      if(Array.isArray(data.fin)) fin = data.fin;
      if(Array.isArray(data.cats)) cats = data.cats;
      saveAll(); refreshCategorySelect(); renderFin();
      alert("Restaurado com sucesso!");
    }catch(e){ alert("Arquivo inválido."); }
  };
  r.readAsText(file);
}

/* ---------- Utils ---------- */
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }

/* ---------- Events ---------- */
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>openTab(t.dataset.tab)));
$("f-cat").addEventListener("change", refreshSubcategorySelect);
$("add-fin").addEventListener("click", addFin);
$("btn-catmgr").addEventListener("click", openCatModal);
$("cat-close").addEventListener("click", closeCatModal);
$("add-cat").addEventListener("click", addCategory);
$("export-json").addEventListener("click", exportJson);
$("import-btn").addEventListener("click", ()=>$("import-json").click());
$("import-json").addEventListener("change", (e)=>{ if(e.target.files[0]) handleImport(e.target.files[0]); });

/* ---------- Init ---------- */
setToday("f-date");
refreshCategorySelect();
renderFin();

// Simple sample pie in Corridas (kept for visual parity)
(function(){
  const ctx = $("cor-pie").getContext("2d");
  corPie = new Chart(ctx, {type:"pie", data:{labels:["A","B"], datasets:[{data:[60,40]}]}});
})();


// ===== CATEGORIAS E SUBCATEGORIAS =====

// Funções utilitárias genéricas para categorias/subcategorias
function getCats(key){
  return JSON.parse(localStorage.getItem(key)||'["Padrão"]');
}
function setCats(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}
function getSubs(key){
  return JSON.parse(localStorage.getItem(key)||'{}');
}
function setSubs(key,obj){
  localStorage.setItem(key, JSON.stringify(obj));
}

// Renderizador de categorias para um select
function renderCatOptions(selectId, cats){
  const sel=document.getElementById(selectId);
  if(!sel) return;
  sel.innerHTML = '';
  cats.forEach(c=>{
    const opt=document.createElement("option");
    opt.value=c; opt.textContent=c;
    sel.appendChild(opt);
  });
}

// ===== Finanças =====
function renderFinCats(){
  const cats = getCats("finCats");
  renderCatOptions("fin-cat", cats);
}
function addFinCat(){
  const c = prompt("Nova categoria:");
  if(!c) return;
  const cats = getCats("finCats");
  cats.push(c);
  setCats("finCats", cats);
  renderFinCats();
}
function addFinSub(cat){
  const s = prompt("Nova subcategoria para "+cat+":");
  if(!s) return;
  const subs = getSubs("finSubs");
  if(!subs[cat]) subs[cat]=[];
  subs[cat].push(s);
  setSubs("finSubs", subs);
}

// ===== Corridas =====
function renderCorCats(){
  const cats = getCats("corCats");
  renderCatOptions("cor-cat", cats);
}
function addCorCat(){
  const c = prompt("Nova categoria:");
  if(!c) return;
  const cats = getCats("corCats");
  cats.push(c);
  setCats("corCats", cats);
  renderCorCats();
}
function addCorSub(cat){
  const s = prompt("Nova subcategoria para "+cat+":");
  if(!s) return;
  const subs = getSubs("corSubs");
  if(!subs[cat]) subs[cat]=[];
  subs[cat].push(s);
  setSubs("corSubs", subs);
}

// ===== Inicialização =====
document.addEventListener("DOMContentLoaded", ()=>{
  if(!localStorage.getItem("finCats")) setCats("finCats", ["Padrão"]);
  if(!localStorage.getItem("corCats")) setCats("corCats", ["Padrão"]);
  renderFinCats();
  renderCorCats();
});


// ---------- Categorias e Subcategorias ----------
function getCategories() {
  return JSON.parse(localStorage.getItem("categories")) || { receitas: {}, despesas: {} };
}
function saveCategories(cats) {
  localStorage.setItem("categories", JSON.stringify(cats));
}

// Funções para adicionar categoria/subcategoria
function addCategory(tipo, nome) {
  let cats = getCategories();
  if (!cats[tipo][nome]) cats[tipo][nome] = [];
  saveCategories(cats);
}
function addSubCategory(tipo, cat, sub) {
  let cats = getCategories();
  if (!cats[tipo][cat]) cats[tipo][cat] = [];
  if (!cats[tipo][cat].includes(sub)) cats[tipo][cat].push(sub);
  saveCategories(cats);
}

// ---------- Relatórios ----------
function generateReports() {
  const entries = JSON.parse(localStorage.getItem("entries")) || [];
  const now = new Date();
  let daily = 0, weekly = 0, monthly = 0;

  entries.forEach(e => {
    let d = new Date(e.date);
    if (d.toDateString() === now.toDateString()) daily += e.type === "income" ? e.amount : -e.amount;

    let startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    let endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    if (d >= startOfWeek && d <= endOfWeek) weekly += e.type === "income" ? e.amount : -e.amount;

    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      monthly += e.type === "income" ? e.amount : -e.amount;
    }
  });

  document.getElementById("daily-summary").innerText = "Resumo diário: " + daily.toFixed(2);
  document.getElementById("weekly-summary").innerText = "Resumo semanal: " + weekly.toFixed(2);
  document.getElementById("monthly-summary").innerText = "Resumo mensal: " + monthly.toFixed(2);
}

// Atualiza relatórios sempre que mudar de aba
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(el => el.style.display = "none");
  document.getElementById(tab).style.display = "block";
  if (tab === "reports") generateReports();
         }
