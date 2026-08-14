// ---------- Datos ----------
const STORE_KEY = 'conductor-registros-v1';

const PLATAFORMAS = {
  uber: { nombre: 'Uber', color: 'var(--uber)' },
  muv:  { nombre: 'MUV',  color: 'var(--muv)' },
  bolt: { nombre: 'Bolt', color: 'var(--bolt)' },
};

const CATEGORIAS = {
  combustible: 'Combustible',
  mantenimiento: 'Mantenimiento',
  comida: 'Comida',
  lavado: 'Lavado',
  cuota: 'Cuota / Alquiler',
  datos: 'Datos móviles',
  otro: 'Otro',
};

let registros = [];
try { registros = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { registros = []; }

function guardar() {
  localStorage.setItem(STORE_KEY, JSON.stringify(registros));
}

// ---------- Utilidades ----------
function fmt(n) { return '₲ ' + Math.round(n).toLocaleString('es-PY'); }

function hoyISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fechaLegible(iso, conAnio) {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  if (conAnio) opts.year = 'numeric';
  return fecha.toLocaleDateString('es-PY', opts);
}

function bruto(regs) { return regs.filter(r => r.tipo === 'ganancia').reduce((s, r) => s + r.monto, 0); }
function gastos(regs) { return regs.filter(r => r.tipo === 'gasto').reduce((s, r) => s + r.monto, 0); }

function registrosEnRango(desde, hasta) {
  return registros.filter(r => r.fecha >= desde && r.fecha <= hasta);
}

function aISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function sumarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  fecha.setDate(fecha.getDate() + n);
  return aISO(fecha);
}

// Lunes de la semana a la que pertenece la fecha (semana lun–dom).
function lunesDe(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const desdeLunes = (fecha.getDay() + 6) % 7; // 0 = lunes ... 6 = domingo
  return sumarDias(iso, -desdeLunes);
}

// Monto abreviado, para que los 7 dias entren en el ancho de un celular.
function fmtCorto(n) {
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  if (abs < 1000000) return Math.round(n / 1000) + 'k';
  return (n / 1000000).toFixed(1).replace('.', ',') + 'M';
}

// ---------- Separador de miles en los campos de monto ----------
function formatoMiles(texto) {
  const digitos = String(texto).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digitos ? Number(digitos).toLocaleString('es-PY') : '';
}

function montoDe(input) {
  return Number(input.value.replace(/\D/g, ''));
}

function conSeparadorMiles(input) {
  input.addEventListener('input', () => {
    const posicion = input.selectionStart;
    const digitosAntes = input.value.slice(0, posicion).replace(/\D/g, '').length;
    input.value = formatoMiles(input.value);

    // Reubicar el cursor después de la misma cantidad de dígitos que tenía delante.
    let cursor = 0;
    if (digitosAntes > 0) {
      let vistos = 0;
      cursor = input.value.length;
      for (let i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i])) vistos++;
        if (vistos === digitosAntes) { cursor = i + 1; break; }
      }
    }
    input.setSelectionRange(cursor, cursor);
  });
}

conSeparadorMiles(document.getElementById('g-monto'));
conSeparadorMiles(document.getElementById('e-monto'));

// ---------- Alta y baja de registros ----------
document.getElementById('form-ganancia').addEventListener('submit', e => {
  e.preventDefault();
  const monto = montoDe(document.getElementById('g-monto'));
  if (!monto || monto <= 0) return;
  registros.push({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    tipo: 'ganancia',
    fecha: document.getElementById('g-fecha').value,
    plataforma: document.getElementById('g-plataforma').value,
    monto,
    viajes: Number(document.getElementById('g-viajes').value) || null,
  });
  guardar();
  document.getElementById('g-monto').value = '';
  document.getElementById('g-viajes').value = '';
  renderTodo();
});

document.getElementById('form-gasto').addEventListener('submit', e => {
  e.preventDefault();
  const monto = montoDe(document.getElementById('e-monto'));
  if (!monto || monto <= 0) return;
  registros.push({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    tipo: 'gasto',
    fecha: document.getElementById('e-fecha').value,
    categoria: document.getElementById('e-categoria').value,
    monto,
    nota: document.getElementById('e-nota').value.trim() || null,
  });
  guardar();
  document.getElementById('e-monto').value = '';
  document.getElementById('e-nota').value = '';
  renderTodo();
});

function borrarRegistro(id) {
  if (!confirm('¿Borrar este registro?')) return;
  registros = registros.filter(r => r.id !== id);
  guardar();
  renderTodo();
}

// ---------- Render: fila de registro ----------
function filaRegistro(r, conFecha) {
  const li = document.createElement('li');
  li.className = 'registro';

  const chip = document.createElement('span');
  let titulo, detalleExtra;
  if (r.tipo === 'ganancia') {
    chip.className = 'chip ' + r.plataforma;
    chip.textContent = PLATAFORMAS[r.plataforma].nombre;
    titulo = 'Ganancia';
    detalleExtra = r.viajes ? r.viajes + ' viajes' : '';
  } else {
    chip.className = 'chip gasto';
    chip.textContent = 'Gasto';
    titulo = CATEGORIAS[r.categoria] || r.categoria;
    detalleExtra = r.nota || '';
  }

  const det = document.createElement('div');
  det.className = 'detalle';
  const partes = [];
  if (conFecha) partes.push(fechaLegible(r.fecha));
  if (detalleExtra) partes.push(detalleExtra);
  det.innerHTML = '<div></div><small></small>';
  det.querySelector('div').textContent = titulo;
  det.querySelector('small').textContent = partes.join(' · ');

  const monto = document.createElement('span');
  monto.className = 'monto ' + (r.tipo === 'ganancia' ? 'positivo' : 'negativo');
  monto.textContent = (r.tipo === 'ganancia' ? '+' : '−') + fmt(r.monto);

  const btn = document.createElement('button');
  btn.className = 'borrar';
  btn.textContent = '🗑';
  btn.title = 'Borrar';
  btn.addEventListener('click', () => borrarRegistro(r.id));

  li.append(chip, det, monto, btn);
  return li;
}

// ---------- Render: tab Hoy ----------
function renderHoy() {
  const hoy = hoyISO();
  const deHoy = registros.filter(r => r.fecha === hoy);
  const b = bruto(deHoy), g = gastos(deHoy), n = b - g;

  document.getElementById('hoy-bruto').textContent = fmt(b);
  document.getElementById('hoy-gastos').textContent = fmt(g);
  const netoEl = document.getElementById('hoy-neto');
  netoEl.textContent = fmt(n);
  netoEl.classList.toggle('negativo', n < 0);

  const ul = document.getElementById('lista-hoy');
  ul.innerHTML = '';
  if (!deHoy.length) {
    ul.innerHTML = '<li class="vacio">Todavía no cargaste nada hoy.</li>';
    return;
  }
  deHoy.slice().reverse().forEach(r => ul.appendChild(filaRegistro(r, false)));
}

// ---------- Render: tab Historial ----------
function renderHistorial() {
  const sel = document.getElementById('filtro-mes');
  const meses = [...new Set(registros.map(r => r.fecha.slice(0, 7)))].sort().reverse();
  const mesActual = hoyISO().slice(0, 7);
  if (!meses.includes(mesActual)) meses.unshift(mesActual);

  const previo = sel.value;
  sel.innerHTML = '';
  meses.forEach(m => {
    const [a, mm] = m.split('-').map(Number);
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = new Date(a, mm - 1, 1).toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
    sel.appendChild(opt);
  });
  sel.value = meses.includes(previo) ? previo : meses[0];

  // La lista va del mes mas nuevo al mas viejo: retroceder es bajar en el indice.
  document.getElementById('mes-prev').disabled = sel.selectedIndex >= sel.options.length - 1;
  document.getElementById('mes-next').disabled = sel.selectedIndex <= 0;

  const cont = document.getElementById('historial');
  cont.innerHTML = '';
  const delMes = registros.filter(r => r.fecha.startsWith(sel.value));
  if (!delMes.length) {
    cont.innerHTML = '<p class="vacio">Sin registros en este mes.</p>';
    return;
  }

  const porDia = {};
  delMes.forEach(r => { (porDia[r.fecha] = porDia[r.fecha] || []).push(r); });

  Object.keys(porDia).sort().reverse().forEach(fecha => {
    const regs = porDia[fecha];
    const b = bruto(regs);
    const neto = b - gastos(regs);
    const grupo = document.createElement('div');
    grupo.className = 'grupo-dia';
    const h3 = document.createElement('h3');
    const spanFecha = document.createElement('span');
    spanFecha.textContent = fechaLegible(fecha, true);
    const totales = document.createElement('span');
    totales.className = 'totales-dia';
    const spanBruto = document.createElement('span');
    spanBruto.className = 'bruto-dia';
    spanBruto.textContent = 'Bruto: ' + fmt(b);
    const spanNeto = document.createElement('span');
    spanNeto.className = 'neto-dia' + (neto < 0 ? ' negativo' : '');
    spanNeto.textContent = 'Neto: ' + fmt(neto);
    totales.append(spanBruto, spanNeto);
    h3.append(spanFecha, totales);
    grupo.appendChild(h3);
    regs.slice().reverse().forEach(r => grupo.appendChild(filaRegistro(r, false)));
    cont.appendChild(grupo);
  });
}

document.getElementById('filtro-mes').addEventListener('change', renderHistorial);

// Las flechas se mueven por los meses del selector (los que tienen registros,
// mas el actual): asi nunca caen en un mes vacio y ambos controles coinciden.
function moverMes(paso) {
  const sel = document.getElementById('filtro-mes');
  const i = sel.selectedIndex + paso;
  if (i < 0 || i >= sel.options.length) return;
  sel.selectedIndex = i;
  renderHistorial();
}

document.getElementById('mes-prev').addEventListener('click', () => moverMes(1));
document.getElementById('mes-next').addEventListener('click', () => moverMes(-1));

// ---------- Exportar CSV ----------
document.getElementById('btn-csv').addEventListener('click', () => {
  const mes = document.getElementById('filtro-mes').value;
  const delMes = registros.filter(r => r.fecha.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const filas = [['fecha', 'tipo', 'plataforma_o_categoria', 'monto_gs', 'viajes', 'nota']];
  delMes.forEach(r => filas.push([
    r.fecha,
    r.tipo,
    r.tipo === 'ganancia' ? PLATAFORMAS[r.plataforma].nombre : (CATEGORIAS[r.categoria] || r.categoria),
    r.monto,
    r.viajes || '',
    r.nota || '',
  ]));
  const csv = filas.map(f => f.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ganancias-' + mes + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Render: tab Resumen ----------
let periodo = 'hoy';
let semanaAtras = 0; // 0 = semana en curso, 1 = la anterior, ...

document.getElementById('selector-periodo').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  periodo = btn.dataset.periodo;
  semanaAtras = 0; // cambiar de periodo vuelve siempre a la semana en curso
  document.querySelectorAll('#selector-periodo button').forEach(b => b.classList.toggle('activa', b === btn));
  renderResumen();
});

// Lunes de la semana que se esta mirando.
function lunesVisible() {
  return sumarDias(lunesDe(hoyISO()), -7 * semanaAtras);
}

// Cuantas semanas atras se puede ir: hasta la del registro mas viejo.
function semanasConDatos() {
  if (!registros.length) return 0;
  const primera = registros.reduce((min, r) => (r.fecha < min ? r.fecha : min), registros[0].fecha);
  const ms = new Date(lunesDe(hoyISO())) - new Date(lunesDe(primera));
  return Math.max(0, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}

document.getElementById('semana-prev').addEventListener('click', () => {
  if (semanaAtras < semanasConDatos()) { semanaAtras++; renderResumen(); }
});

document.getElementById('semana-next').addEventListener('click', () => {
  if (semanaAtras > 0) { semanaAtras--; renderResumen(); }
});

function regsDelPeriodo() {
  const hoy = hoyISO();
  if (periodo === 'hoy') return registrosEnRango(hoy, hoy);
  if (periodo === 'semana') {
    const lunes = lunesVisible();
    return registrosEnRango(lunes, sumarDias(lunes, 6));
  }
  return registros.filter(r => r.fecha.startsWith(hoy.slice(0, 7)));
}

function barra(cont, etiqueta, valor, max, color) {
  const fila = document.createElement('div');
  fila.className = 'barra-fila';
  const etiquetas = document.createElement('div');
  etiquetas.className = 'etiquetas';
  etiquetas.innerHTML = '<span></span><span class="valor"></span>';
  etiquetas.children[0].textContent = etiqueta;
  etiquetas.children[1].textContent = fmt(valor);
  const pista = document.createElement('div');
  pista.className = 'barra-pista';
  const relleno = document.createElement('div');
  relleno.className = 'barra-relleno';
  relleno.style.width = (max > 0 ? Math.max(2, (valor / max) * 100) : 0) + '%';
  relleno.style.background = color;
  pista.appendChild(relleno);
  fila.append(etiquetas, pista);
  cont.appendChild(fila);
}

function renderResumen() {
  const regs = regsDelPeriodo();
  const b = bruto(regs), g = gastos(regs), n = b - g;

  document.getElementById('res-bruto').textContent = fmt(b);
  document.getElementById('res-gastos').textContent = fmt(g);
  const netoEl = document.getElementById('res-neto');
  netoEl.textContent = fmt(n);
  netoEl.classList.toggle('negativo', n < 0);

  // Por plataforma
  const contP = document.getElementById('res-plataformas');
  contP.innerHTML = '';
  const totalesP = Object.keys(PLATAFORMAS).map(p => ({
    p,
    total: regs.filter(r => r.tipo === 'ganancia' && r.plataforma === p).reduce((s, r) => s + r.monto, 0),
  }));
  const maxP = Math.max(...totalesP.map(t => t.total));
  if (maxP === 0) contP.innerHTML = '<p class="vacio">Sin ganancias en este período.</p>';
  else totalesP.filter(t => t.total > 0).sort((a, b2) => b2.total - a.total)
    .forEach(t => barra(contP, PLATAFORMAS[t.p].nombre, t.total, maxP, PLATAFORMAS[t.p].color));

  // Gastos por categoría
  const contC = document.getElementById('res-categorias');
  contC.innerHTML = '';
  const totalesC = Object.keys(CATEGORIAS).map(c => ({
    c,
    total: regs.filter(r => r.tipo === 'gasto' && r.categoria === c).reduce((s, r) => s + r.monto, 0),
  })).filter(t => t.total > 0).sort((a, b2) => b2.total - a.total);
  if (!totalesC.length) contC.innerHTML = '<p class="vacio">Sin gastos en este período.</p>';
  else {
    const maxC = totalesC[0].total;
    totalesC.forEach(t => barra(contC, CATEGORIAS[t.c], t.total, maxC, 'var(--rojo)'));
  }

  // Gráfico neto de la semana que se está mirando (lunes a domingo)
  const hoy = hoyISO();
  const lunes = lunesVisible();
  const domingo = sumarDias(lunes, 6);

  const rango = document.getElementById('rango-semana');
  const opts = { day: 'numeric', month: 'short' };
  const [la, lm, ld] = lunes.split('-').map(Number);
  const [da, dm, dd] = domingo.split('-').map(Number);
  const conAnio = la !== new Date().getFullYear();
  rango.textContent = new Date(la, lm - 1, ld).toLocaleDateString('es-PY', opts) +
    ' – ' + new Date(da, dm - 1, dd).toLocaleDateString('es-PY', conAnio ? { ...opts, year: 'numeric' } : opts);

  document.getElementById('semana-prev').disabled = semanaAtras >= semanasConDatos();
  document.getElementById('semana-next').disabled = semanaAtras <= 0;

  const graf = document.getElementById('grafico-semana');
  graf.innerHTML = '';
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(lunes, i);
    const regsDia = registros.filter(r => r.fecha === f);
    const brutoDia = bruto(regsDia);
    dias.push({ fecha: f, brutoDia, neto: brutoDia - gastos(regsDia) });
  }
  const maxAbs = Math.max(1, ...dias.map(d => Math.abs(d.neto)));
  const etiquetas = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  dias.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'columna' + (d.fecha === hoy ? ' hoy' : '');
    col.title = fechaLegible(d.fecha) + ' · Bruto: ' + fmt(d.brutoDia) + ' · Neto: ' + fmt(d.neto);

    // El bruto del dia arriba de la barra; los dias sin nada quedan en blanco.
    const valor = document.createElement('small');
    valor.className = 'valor';
    valor.textContent = d.brutoDia > 0 ? fmtCorto(d.brutoDia) : '';

    // La barra vive en su propia pista de alto fijo, asi la etiqueta de arriba
    // no le come altura ni distorsiona la proporcion entre dias.
    const pista = document.createElement('div');
    pista.className = 'pista';
    const palo = document.createElement('div');
    palo.className = 'palo' + (d.neto < 0 ? ' negativo' : '') + (d.fecha > hoy ? ' futuro' : '');
    palo.style.height = Math.max(2, (Math.abs(d.neto) / maxAbs) * 100) + '%';
    pista.appendChild(palo);

    const lbl = document.createElement('small');
    lbl.textContent = etiquetas[i];
    col.append(valor, pista, lbl);
    graf.appendChild(col);
  });
}

// ---------- Navegación entre tabs ----------
document.querySelector('.nav-inferior').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('.nav-inferior button').forEach(b => b.classList.toggle('activa', b === btn));
  document.querySelectorAll('main .tab').forEach(t => t.classList.toggle('activa', t.id === 'tab-' + btn.dataset.tab));
});

// ---------- Inicialización ----------
function renderTodo() {
  renderHoy();
  renderHistorial();
  renderResumen();
}

document.getElementById('g-fecha').value = hoyISO();
document.getElementById('e-fecha').value = hoyISO();
document.getElementById('fecha-actual').textContent =
  new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

renderTodo();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
