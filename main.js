document.addEventListener("DOMContentLoaded", iniciar_app);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function cargar_datos() {
    return d3.json("../data/resultado_fusionado.json")
}

function iniciar_app() {

    cargar_datos().then(
        function (data) {
            console.log("Datos cargados correctamente.");
            // console.log(data.clientes);
            iniciar(procesar_data(data));
            // procesar_data(data)
        }
    ).catch(err => {
        console.error(err);
        d3.select("#sub")
            .style("color", "#d33")
            .text("No se pudo cargar los datos.");
    });

}

function procesar_data(data) {

    const clientes = data.clientes
    // solo compras utilizables (con fecha y al menos un artículo)
    const esValida = compra => compra.fecha && compra.articulos && compra.articulos.length

    const inicioSemana = fecha => {                       // lunes de la semana de una fecha ISO
        const d = new Date(fecha.slice(0, 10) + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
        return d.toISOString().slice(0, 10);
    }

    const ventas =
        clientes.flatMap(cliente =>
            cliente.compras.filter(esValida)
                .map(compra => ({
                    clienteId: cliente._id,
                    ciudad: cliente.direccion.ciudad,
                    fecha: compra.fecha.slice(0, 10),
                    mes: compra.fecha.slice(0, 7),
                    semana: inicioSemana(compra.fecha),
                    producto: compra.articulos[0].nombre,
                    unidades: d3.sum(compra.articulos, a => a.cantidad || 0),
                    total: compra.total || 0, costoEnvio: compra.envio?.costo || 0, conSeguro: !!compra.envio?.seguro,
                    estatus: compra.estatus, metodoPago: compra.metodo_pago
                }))
        )

    const meses = [...new Set(ventas.map(v => v.mes))].sort()
    const ciudades = [...new Set(ventas.map(v => v.ciudad))].sort(d3.ascending)

    // console.log("Ventas:", ventas);
    // console.log("Clientes:", clientes.length);
    // console.log("Ciudades:", ciudades);
    // console.log("Productos:", productos); 
    // console.log("compras", compras) 

    return {
        clientes, ciudades, meses, ventas
    };
}

function iniciar(data_procesada) {
    const {
        ventas, ciudades, meses
    } = data_procesada;

    const $ = id => d3.select("#" + id)
    const fmtEntero = d3.format(",.0f")
    const fmtDinero = v => "$" + fmtEntero(v)
    const fmtPct = d3.format(".1%")
    const colorDe = d3.scaleOrdinal(d3.schemeTableau10)
    const dividir = (a, b) => b ? a / b : 0
    const tooltip = d3.select("#tip")
    colorDe.domain(ciudades)   // mismo color por ciudad en el mapa y en el comparativo mensual
    // const fmtFecha = iso => iso.split("-").reverse().join("/")
    const sumarPor = (ventas, clave, campo) =>
        d3.rollup(ventas, v => d3.sum(v, d => d[campo]), d => d[clave]);// Map: clave -> suma del campo

    function crearSvg(id, alto, ancho = 440) {
        const contenedor = $(id);
        contenedor.selectAll("*").remove();
        return contenedor.append("svg").attr("viewBox", `0 0 ${ancho} ${alto}`);
    }

    function leyenda(id, textos, colores = [AZUL, NARANJA]) {
        d3.select("#" + id)
            .html(textos.map((t, i) =>
                `<span><i style="background:${colores[i]}"></i>${t}</span>`).join("")
            );
    }

    function barras(id, serie, formato) {// serie: [{etiqueta, valor}]
        const lienzo = crearSvg(id, serie.length * 30 + 10)
        const escX = d3.scaleLinear([0, d3.max(serie, d => d.valor) || 1], [0, 230])
        const filas = lienzo.selectAll("g")
            .data(serie)
            .join("g")
            .attr("transform", (d, i) => `translate(0,${i * 30 + 4})`);

        filas.append("text")
            .attr("x", 110)
            .attr("y", 14)
            .attr("text-anchor", "end")
            .attr("class", "lb")
            .text(d => d.etiqueta);

        filas.append("rect").attr("x", 116)
            .attr("height", 20)
            .attr("rx", 3)
            .attr("width", d => escX(d.valor))
            .attr("fill", d => colorDe(d.etiqueta));

        filas.append("text")
            .attr("x", d => 120 + escX(d.valor))
            .attr("y", 14)
            .attr("class", "lb")
            .text(d => formato(d.valor));
    }

    function dibujarMensual() {
        const serie = meses.map((mes, i) => {
            const delMes = ventas.filter(v => v.mes == mes);
            const fila = {
                etiqueta: MESES[+mes.slice(5) - 1] + (i == meses.length - 1 ? "*" : ""),
                total: d3.sum(delMes, v => v.total),
                clientes: new Set(delMes.map(v => v.clienteId)).size
            };

            ciudades.forEach(ciudad => fila[ciudad] =
                d3.sum(delMes.filter(v => v.ciudad == ciudad), v => v.total)
            );
            return fila;
        })
        const lienzo = crearSvg("mes", 250)
        const escX = d3.scaleBand(
            serie.map(d => d.etiqueta), [30, 430]
        ).padding(.25)
        const escY = d3.scaleLinear([0, (d3.max(serie, d => d.total) || 1) * 1.05], [205, 40])
        const centroX = d => escX(d.etiqueta) + escX.bandwidth() / 2;

        lienzo.append("g")
            .attr("class", "ax")
            .attr("transform", "translate(0,205)")
            .call(d3.axisBottom(escX).tickSize(0));

        lienzo.selectAll("g.capa").data(d3.stack().keys(ciudades)(serie))
            .join("g")
            .attr("class", "capa")
            .attr("fill", capa => colorDe(capa.key))
            .selectAll("rect").data(capa => capa)
            .join("rect")
            .attr("x", d => escX(d.data.etiqueta))
            .attr("y", d => escY(d[1]))
            .attr("width", escX.bandwidth())
            .attr("height", d => escY(d[0]) - escY(d[1]));

        const textos = lienzo
            .selectAll("text.t")
            .data(serie).join("text")
            .attr("class", "lb").attr("text-anchor", "middle");

        textos.append("tspan").attr("x", centroX)
            .attr("y", d => escY(d.total) - 34)
            .text(d => fmtDinero(d.total));

        textos.append("tspan")
            .attr("x", centroX)
            .attr("dy", 11)
            .text((d, i) => i &&
                serie[i - 1].total ? (d.total >= serie[i - 1].total ? "+" : "")
            + fmtPct(d.total / serie[i - 1].total - 1) : ""
            );

        textos.append("tspan")
            .attr("x", centroX)
            .attr("dy", 11)
            .attr("fill", "var(--sub)")
            .text(d => fmtEntero(d.clientes) + " clientes");

        leyenda("lgc", ciudades, ciudades.map(colorDe));
        const ultimo = ventas.map(v => v.fecha).sort().pop();
        // d3.select("#nm").text(`* Último mes con datos solo hasta el ${fmtFecha(ultimo)}; el % es el cambio contra el mes anterior.`);
    }

    function kpi() {
        const ingreso = d3.sum(ventas, v => v.total)
        const nCompras = ventas.length
        const nClientes = new Set(ventas.map(v => v.clienteId)).size

        const kpis = [
            [fmtEntero(nClientes), "Clientes atendidos"],
            [fmtDinero(ingreso), "Ingreso"],
            [fmtEntero(nCompras), "Compras"],
            [fmtDinero(dividir(ingreso, nCompras)), "Ticket promedio"],
            [dividir(nCompras, nClientes).toFixed(1), "Compras por cliente"],
            ["$" + d3.mean(ventas, v => v.costoEnvio).toFixed(2), "Envío promedio"]
        ];

        $("kp").html(
            kpis.map(k => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`)
                .join("")
        );
    }

    function dibujarTopProductos() {
        const unidades = [...sumarPor(ventas, "producto", "unidades")]
            .map(([etiqueta, valor]) => ({ etiqueta, valor }));
        barras(
            "top", unidades.sort((a, b) => b.valor - a.valor)
                .slice(0, 10), v => fmtEntero(v) + " uds."
        );
    }

    function dibujarEnvio() {
        const costoMedio = [
            ...d3.rollup(ventas, v => d3.mean(v, d => d.costoEnvio), d => d.ciudad)
        ].map(([etiqueta, valor]) => ({ etiqueta, valor }));

        barras("env", costoMedio.sort((a, b) => b.valor - a.valor), v => "$" + v.toFixed(2));

        const conSeguro = ventas.filter(v => v.conSeguro)
        const sinSeguro = ventas.filter(v => !v.conSeguro)

        $("envx")
            .html(`Costo medio por envío (barras). Con seguro: <b>$${(d3.mean(conSeguro, v => v.costoEnvio) || 0).toFixed(2)}</b> · sin seguro: <b>$${(d3.mean(sinSeguro, v => v.costoEnvio) || 0).toFixed(2)}</b> · el envío equivale al <b>${fmtPct(dividir(d3.sum(ventas, v => v.costoEnvio), d3.sum(ventas, v => v.total)))}</b> del ingreso.`);
    }

    function dibujarMapa() {
        const ancho = 700
        const alto = 400
        const lienzo = crearSvg("map", alto, ancho)

        // Mapa base
        lienzo.append("image")
            .attr("href", "../data/mexico.svg")
            .attr("class", "mapa-base")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", ancho)
            .attr("height", alto)
            .attr("preserveAspectRatio", "xMidYMid meet")

        const posiciones = {
            "Monterrey": { x: 410, y: 160 },
            "Guadalajara": { x: 285, y: 310 },
            "Querétaro": { x: 390, y: 320 },
            "Ciudad de México": { x: 405, y: 365 },
            "Puebla": { x: 440, y: 365 }
        }

        // Compras e ingreso por ciudad (ventas ya trae ciudad y total)
        const datos = d3.rollups(
            ventas,
            grupo => ({
                cantidad: grupo.length,
                total: d3.sum(grupo, d => d.total)
            }),
            d => d.ciudad
        ).map(([ciudad, valores]) => ({
            ciudad,
            cantidad: valores.cantidad,
            total: valores.total,
            posicion: posiciones[ciudad]
        })).filter(d => d.posicion)

        console.log("Datos del mapa:", datos);
        // Tamaño de las burbujas
        const radio = d3.scaleSqrt()
            .domain([0, d3.max(datos, d => d.cantidad)])
            .range([8, 32])

        lienzo.selectAll(".burbuja-ciudad")
            .data(datos)
            .join("circle")
            .attr("class", "burbuja-ciudad")
            .attr("cx", d => d.posicion.x)
            .attr("cy", d => d.posicion.y)
            .attr("fill", d => colorDe(d.ciudad))
            .attr("opacity", 0.85)
            .attr("r", 0)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("opacity", 0.65)
                tooltip
                    .style("visibility", "visible")
                    .html(`
                        <strong>${d.ciudad}</strong><br>
                        Compras: ${d.cantidad}<br>
                        Ventas: $${d.total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    `)
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 20) + "px")
            })
            .on("mouseout", function () {
                d3.select(this).attr("opacity", 0.85)
                tooltip.style("visibility", "hidden")
            })
            .transition()
            .duration(1000)
            .attr("r", d => radio(d.cantidad))

    }

    function draw() {
        kpi();
        dibujarMensual();
        dibujarTopProductos();
        dibujarEnvio();
        dibujarMapa();
    }

    draw();

}