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
    desc: $("f-desc").value.trim(
