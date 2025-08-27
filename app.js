// ===== STORAGE =====
const STORAGE_KEY = "finData";
const CAT_KEY = "finCats";
let fin = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let cats = JSON.parse(localStorage.getItem(CAT_KEY)) || [
  { name: "Alimentação", subs: ["Mercado", "Restaurante"] },
  { name: "Moradia", subs: ["Aluguel", "Luz", "Água"] },
  { name: "Transporte", subs: ["Ônibus", "Combustível"] },
];

// ===== ELEMENTOS =====
const fDate = document.getElementById("f-date");
const fDesc = document.getElementById("f-desc");
const fCat = document.getElementById("f-cat");
const fSub = document.getElementById("f-sub");
const fType = document.getElementById("f-type");
const fVal = document.getElementById("f-val");
const addFinBtn = document.getElementById("add-fin");
const finTable = document.getElementById("fin-table");
const totalEntr = document.getElementById("total-entr");
const totalSai = document.getElementById("total-sai");
const totalSaldo = document.getElementById("total-saldo");
const finPie = document.getElementById("fin-pie");

// Categorias
const catList = document.getElementById("cat-list");
const newCatInput = document.getElementById("new-cat");
const addCatBtn = document.getElementById("add-cat");
// ===== FUNÇÕES =====

// Salvar dados
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fin));
    localStorage.setItem(CAT_KEY, JSON.stringify(cats));
}

// Renderizar categorias no select do formulário
function renderCatSelect() {
    fCat.innerHTML = "";
    cats.forEach((c, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = c.name;
        fCat.appendChild(opt);
    });
    renderSubSelect();
}

// Renderizar subcategorias dependendo da categoria selecionada
function renderSubSelect() {
    const catIndex = fCat.value;
    fSub.innerHTML = "";
    if(cats[catIndex] && cats[catIndex].subs.length) {
        cats[catIndex].subs.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s;
            fSub.appendChild(opt);
        });
    } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-";
        fSub.appendChild(opt);
    }
}

// Renderizar lista de categorias na aba Categorias
function renderCatList() {
    catList.innerHTML = "";
    cats.forEach((c, i) => {
        const div = document.createElement("div");
        div.style.marginBottom = "6px";

        const title = document.createElement("input");
        title.value = c.name;
        title.style.width = "60%";
        title.onchange = () => {
            c.name = title.value;
            saveData();
            renderCatSelect();
            renderFinChart();
        };
        div.appendChild(title);

        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑";
        delBtn.className = "btn";
        delBtn.onclick = () => {
            cats.splice(i,1);
            saveData();
            renderCatSelect();
            renderCatList();
            renderFinChart();
        };
        div.appendChild(delBtn);

        // Subcategorias
        const subDiv = document.createElement("div");
        subDiv.style.marginLeft = "20px";
        c.subs.forEach((s, j) => {
            const subInput = document.createElement("input");
            subInput.value = s;
            subInput.style.width = "50%";
            subInput.onchange = () => {
                c.subs[j] = subInput.value;
                saveData();
                renderSubSelect();
            };
            subDiv.appendChild(subInput);

            const subDel = document.createElement("button");
            subDel.textContent = "🗑";
            subDel.className = "btn";
            subDel.onclick = () => {
                c.subs.splice(j,1);
                saveData();
                renderSubSelect();
                renderCatList();
            };
            subDiv.appendChild(subDel);

            subDiv.appendChild(document.createElement("br"));
        });

        const addSubBtn = document.createElement("button");
        addSubBtn.textContent = "+ Subcategoria";
        addSubBtn.className = "btn";
        addSubBtn.onclick = () => {
            c.subs.push("Nova Subcategoria");
            saveData();
            renderSubSelect();
            renderCatList();
        };
        subDiv.appendChild(addSubBtn);

        div.appendChild(subDiv);
        catList.appendChild(div);
    });
                 }
// ===== ADICIONAR LANÇAMENTO =====
addFinBtn.onclick = () => {
    const date = fDate.value;
    const desc = fDesc.value.trim();
    const catIndex = fCat.value;
    const cat = cats[catIndex] ? cats[catIndex].name : "";
    const sub = fSub.value || "";
    const type = fType.value;
    const value = parseFloat(fVal.value);

    if(!date || !desc || !cat || isNaN(value)) {
        alert("Preencha todos os campos corretamente!");
        return;
    }

    fin.unshift({date, desc, cat, sub, type, value});
    saveData();
    renderFin();
    fDesc.value = "";
    fVal.value = "";
};

// ===== RENDER FIN =====
function renderFin() {
    // Tabela
    finTable.innerHTML = "";
    if(fin.length === 0) { finTable.innerHTML = "<p>Nenhum lançamento</p>"; return; }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Subcategoria</th><th>Tipo</th><th>Valor</th></tr>";
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    fin.forEach(f => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${f.date}</td><td>${f.desc}</td><td>${f.cat}</td><td>${f.sub}</td><td>${f.type}</td><td>R$ ${f.value.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    finTable.appendChild(table);

    // Resumo
    let totalE = 0, totalS = 0;
    fin.forEach(f => {
        if(f.type==="Entrada") totalE += f.value;
        else totalS += f.value;
    });
    totalEntr.textContent = `R$ ${totalE.toFixed(2)}`;
    totalSai.textContent = `R$ ${totalS.toFixed(2)}`;
    totalSaldo.textContent = `R$ ${(totalE-totalS).toFixed(2)}`;

    renderFinChart();
}

// ===== GRÁFICO FIN =====
let pieChart;
function renderFinChart() {
    const catTotals = {};
    fin.forEach(f => {
        if(!catTotals[f.cat]) catTotals[f.cat] = 0;
        catTotals[f.cat] += f.value * (f.type==="Saída"?1:-1);
    });

    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);

    const chartData = {
        labels,
        datasets: [{
            data,
            backgroundColor: labels.map(()=>`hsl(${Math.random()*360},60%,60%)`)
        }]
    };

    if(pieChart) pieChart.destroy();
    pieChart = new Chart(finPie, { type: 'pie', data: chartData });
}

// ===== INIT =====
renderCatSelect();
renderCatList();
renderFin();
fCat.onchange = renderSubSelect;
// ===== BACKUP / RESTAURAÇÃO =====
document.getElementById("export-json").onclick = () => {
    const dataStr = JSON.stringify({fin, cats}, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fin_data_backup.json";
    a.click();
    URL.revokeObjectURL(url);
};

document.getElementById("import-btn").onclick = () => {
    document.getElementById("import-json").click();
};

document.getElementById("import-json").onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const obj = JSON.parse(ev.target.result);
            if(obj.fin && obj.cats) {
                fin = obj.fin;
                cats = obj.cats;
                saveData();
                renderFin();
                renderCatSelect();
                renderCatList();
                alert("Dados restaurados com sucesso!");
            } else {
                alert("Arquivo inválido!");
            }
        } catch {
            alert("Erro ao ler o arquivo!");
        }
    };
    reader.readAsText(file);
};

// ===== ABAS =====
const tabs = document.querySelectorAll(".tab");
const sections = {fin: document.getElementById("fin"), cor: document.getElementById("cor"), cat: document.getElementById("cat")};

tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        Object.values(sections).forEach(s => s.style.display="none");
        if(tab.id==="tab-fin") sections.fin.style.display="block";
        if(tab.id==="tab-cor") sections.cor.style.display="block";
        if(tab.id==="tab-cat") sections.cat.style.display="block";
    };
});
