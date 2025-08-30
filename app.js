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

  // chama relatórios
  renderRelatoriosSaidas();
  renderRelatoriosEntradas();
}

/* ---------- Relatórios Saídas ---------- */
function renderRelatoriosSaidas(){
  // tabela
  const container = $("rel-sai-table"); container.innerHTML="";
  const saidas = fin.filter(r=>r.type==="Saída");
  if(saidas.length===0){ container.innerHTML="<div class='small'>Sem saídas.</div>"; }
  else{
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Data</th><th>Desc</th><th>Categoria</th><th>Subcat</th><th>Valor</th></tr></thead>";
    const tbody = document.createElement("tbody");
    saidas.slice().reverse().forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.date}</td><td>${escapeHtml(r.desc)}</td><td>${escapeHtml(r.category)}</td><td>${r.subcategory||"-"}</td><td>${fmt(r.value)}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // pizza categorias
  const byCat = {};
  saidas.forEach(r=>{ byCat[r.category] = (byCat[r.category]||0)+r.value; });
  const c1 = $("rel-sai-cat");
  if(c1 && window.Chart){
    if(window.relSaiCat) window.relSaiCat.destroy();
    window.relSaiCat = new Chart(c1.getContext("2d"), { type:"pie", data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat)}]}, options:{responsive:true} });
  }

  // pizza subcats
  const bySub = {};
  saidas.forEach(r=>{
    const key = r.subcategory || "(sem subcategoria)";
    bySub[key] = (bySub[key]||0)+r.value;
  });
  const c2 = $("rel-sai-subcat");
  if(c2 && window.Chart){
    if(window.relSaiSub) window.relSaiSub.destroy();
    window.relSaiSub = new Chart(c2.getContext("2d"), { type:"pie", data:{labels:Object.keys(bySub),datasets:[{data:Object.values(bySub)}]}, options:{responsive:true} });
  }
}

/* ---------- Relatórios Entradas ---------- */
function renderRelatoriosEntradas(){
  // tabela
  const container = $("rel-ent-table"); container.innerHTML="";
  const entradas = fin.filter(r=>r.type==="Entrada");
  if(entradas.length===0){ container.innerHTML="<div class='small'>Sem entradas.</div>"; }
  else{
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Data</th><th>Desc</th><th>Categoria</th><th>Subcat</th><th>Valor</th></tr></thead>";
    const tbody = document.createElement("tbody");
    entradas.slice().reverse().forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.date}</td><td>${escapeHtml(r.desc)}</td><td>${escapeHtml(r.category)}</td><td>${r.subcategory||"-"}</td><td>${fmt(r.value)}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // pizza categorias
  const byCat = {};
  entradas.forEach(r=>{ byCat[r.category] = (byCat[r.category]||0)+r.value; });
  const c1 = $("rel-ent-cat");
  if(c1 && window.Chart){
    if(window.relEntCat) window.relEntCat.destroy();
    window.relEntCat = new Chart(c1.getContext("2d"), { type:"pie", data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat)}]}, options:{responsive:true} });
  }

  // pizza subcats
  const bySub = {};
  entradas.forEach(r=>{
    const key = r.subcategory || "(sem subcategoria)";
    bySub[key] = (bySub[key]||0)+r.value;
  });
  const c2 = $("rel-ent-subcat");
  if(c2 && window.Chart){
    if(window.relEntSub) window.relEntSub.destroy();
    window.relEntSub = new Chart(c2.getContext("2d"), { type:"pie", data:{labels:Object.keys(bySub),datasets:[{data:Object.values(bySub)}]}, options:{responsive:true} });
  }
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
        if(!confirm("Remover subcategoria? (Lançamentos
