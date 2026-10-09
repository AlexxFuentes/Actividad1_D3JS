const tooltip = d3.select("#tooltip");

d3.json("data/resultado_fusionado.json")
    .then(data => {

        const clientes = data.clientes;

        const compras = clientes.flatMap(cliente =>
            (cliente.compras || []).map(compra => ({
                ...compra,
                cliente_id: cliente._id,
                ciudad: cliente.direccion?.ciudad
            }))
        );

        const articulos = compras.flatMap(compra =>
            (compra.articulos || []).map(articulo => ({
                ...articulo,
                compra_id: compra._id,
                fecha: compra.fecha,
                ciudad: compra.ciudad
            }))
        );

        crearMapa(compras);

        crearTopProductos(articulos);
        crearEvolucionVentas(compras);
        crearComparativoMensual(compras);
        crearEstados(compras);
        crearCostosEnvio(compras);
        crearMetodosPago(compras);
        crearCategorias(clientes);

    })
    .catch(error => {
        console.error("Error:", error);
    });

//
//barras
function crearBarrasVerticales(selector, datos, campoX, campoY, color  = "#2563eb") {
    const width = 700;
    const height = 400;
    const margin = {
        top: 30,
        right: 30,
        bottom: 70,
        left: 70
    };
    const svg = d3.select(selector)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);
    const x = d3.scaleBand()
        .domain(datos.map(d => d[campoX]))
        .range([margin.left, width - margin.right])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(datos, d => d[campoY])])
        .nice()
        .range([height - margin.bottom, margin.top]);
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    svg.selectAll("rect")
        .data(datos)
        .join("rect")
        .attr("fill", color)
        .attr("x", d => x(d[campoX]))
        .attr("width", x.bandwidth())
        .attr("y", height - margin.bottom)
        .attr("height", 0)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7);
            tooltip
                .style("visibility", "visible")
                .html(`
                    <strong>${d[campoX]}</strong><br>
                    ${d[campoY]}
                `);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.style("visibility", "hidden");
        })
        .transition()
        .duration(800)
        .attr("y", d => y(d[campoY]))
        .attr(
            "height",
            d => height - margin.bottom - y(d[campoY])
        );
}
//

//Top 10 Productocs
function crearTopProductos(articulos) {

    const datos = d3.rollups(
        articulos,
        grupo => d3.sum(grupo, d => d.cantidad),
        d => d.nombre
    )
    .map(([producto, cantidad]) => ({ producto, cantidad }))
    .sort((a, b) => d3.descending(a.cantidad, b.cantidad))
    .slice(0, 10);

    const width = 700;
    const height = 450;

    const margin = {
        top: 20,
        right: 40,
        bottom: 50,
        left: 160
    };

    const svg = d3.select("#grafico-productos")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);
    const x = d3.scaleLinear()
        .domain([0, d3.max(datos, d => d.cantidad)])
        .nice()
        .range([margin.left, width - margin.right]);
    const y = d3.scaleBand()
        .domain(datos.map(d => d.producto))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    svg.selectAll(".barra")
        .data(datos)
        .join("rect")
        .attr("class", "barra")
        .attr("fill", "#2563eb")
        .attr("x", margin.left)
        .attr("y", d => y(d.producto))
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 0.7);
            tooltip
                .style("visibility", "visible")
                .html(`
                    <strong>${d.producto}</strong><br>
                    Unidades: ${d.cantidad}
                `);
        })
        .on("mousemove", function(event) {

            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {

            d3.select(this)
                .attr("opacity", 1);

            tooltip.style("visibility", "hidden");
        })
        .transition()
        .duration(1000)
        .attr("width", d => x(d.cantidad) - margin.left);
}

//Evolución Ventas
function crearEvolucionVentas(compras) {

    const parseFecha = d3.isoParse;
    const datos = d3.rollups(
        compras,
        grupo => d3.sum(grupo, d => +d.total || 0),
        d => d3.timeDay(parseFecha(d.fecha))
    )
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha - b.fecha);
    const width = 700;
    const height = 400;
    const margin = {
        top: 30,
        right: 30,
        bottom: 60,
        left: 80
    };
    const svg = d3.select("#grafico-evolucion")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const x = d3.scaleTime()
        .domain(d3.extent(datos, d => d.fecha))
        .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(datos, d => d.total)])
        .nice()
        .range([height - margin.bottom, margin.top]);
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    const linea = d3.line()
        .x(d => x(d.fecha))
        .y(d => y(d.total));
    svg.append("path")
        .datum(datos)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2.5)
        .attr("d", linea);
}

//Comparativo mensual
function crearComparativoMensual(compras) {
    const datos = d3.rollups(
        compras,
        grupo => grupo.length,
        d => d3.timeFormat("%Y-%m")(d3.isoParse(d.fecha))
    )
    .map(([mes, compras]) => ({ mes, compras }))
    .sort((a, b) => d3.ascending(a.mes, b.mes));
    crearBarrasVerticales(
        "#grafico-mensual",
        datos,
        "mes",
        "compras",
        "#002983"
    );
}

//Estado Pedidos
function crearEstados(compras) {
    const datos = d3.rollups(
        compras,
        grupo => grupo.length,
        d => d.estatus
    )
    .map(([estatus, cantidad]) => ({
        estatus,
        cantidad
    }));
    crearBarrasVerticales(
        "#grafico-estados",
        datos,
        "estatus",
        "cantidad",
        "#8b5cf6"
    );
}

//Costo de Envío
function crearCostosEnvio(compras) {
    const datos = d3.rollups(
        compras.filter(d => d.envio?.costo != null),
        grupo => d3.mean(
            grupo,
            d => +d.envio.costo
        ),
        d => d.envio?.tipo
    )
    .map(([tipo, promedio]) => ({
        tipo,
        promedio: +promedio.toFixed(2)
    }));
    crearBarrasVerticales(
        "#grafico-envios",
        datos,
        "tipo",
        "promedio",
        "#f59e0b"
    );
}

//Metodos de PAgo
function crearMetodosPago(compras) {
    const datos = d3.rollups(
        compras,
        grupo => grupo.length,
        d => d.metodo_pago
    )
    .map(([metodo, cantidad]) => ({
        metodo,
        cantidad
    }));
    crearBarrasVerticales(
        "#grafico-pagos",
        datos,
        "metodo",
        "cantidad",
        "#ec4899"
    );
}

//Categorias Favoritas
function crearCategorias(clientes) {
    const categorias = clientes.flatMap(cliente =>
        cliente.preferencias?.categorias_favoritas || []
    );
    const datos = d3.rollups(
        categorias,
        grupo => grupo.length,
        categoria => categoria
    )
    .map(([categoria, cantidad]) => ({
        categoria,
        cantidad
    }))
    .sort((a, b) => d3.descending(a.cantidad, b.cantidad));
    crearBarrasVerticales(
        "#grafico-categorias",
        datos,
        "categoria",
        "cantidad"
    );
}

//Mapa
function crearMapa(compras) {

    const width = 700;
    const height = 500;

    const svg = d3.select("#grafico-mapa")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    // Mapa base
    svg.append("image")
        .attr("href", "data/mexico.svg")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("filter", "invert(85%)");

    // Posiciones aproximadas sobre nuestro SVG
    const posiciones = {
        "Monterrey": {
            x: 410,
            y: 160
        },
        "Guadalajara": {
            x: 285,
            y: 310
        },
        "Querétaro": {
            x: 390,
            y: 320
        },
        "Ciudad de México": {
            x: 405,
            y: 365
        },
        "Puebla": {
            x: 440,
            y: 365
        }
    };

    // Agrupar las compras por ciudad
    const datos = d3.rollups(
        compras,
        grupo => ({
            cantidad: grupo.length,
            total: d3.sum(grupo, d => +d.total || 0)
        }),
        d => d.ciudad
    )
    .map(([ciudad, valores]) => ({
        ciudad,
        cantidad: valores.cantidad,
        total: valores.total,
        posicion: posiciones[ciudad]
    }))
    .filter(d => d.posicion);

    console.log("Datos del mapa:", datos);

    // Tamaño de las burbujas
    const radio = d3.scaleSqrt()
        .domain([0, d3.max(datos, d => d.cantidad)])
        .range([8, 32]);

    // Dibujar burbujas
    svg.selectAll(".burbuja-ciudad")
        .data(datos)
        .join("circle")
        .attr("class", "burbuja-ciudad")
        .attr("cx", d => d.posicion.x)
        .attr("cy", d => d.posicion.y)
        .attr("r", 0)

        .on("mouseover", function(event, d) {

            d3.select(this)
                .attr("opacity", 0.65);

            tooltip
                .style("visibility", "visible")
                .html(`
                    <strong>${d.ciudad}</strong><br>
                    Compras: ${d.cantidad}<br>
                    Ventas: $${d.total.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                `);
        })

        .on("mousemove", function(event) {

            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        })

        .on("mouseout", function() {

            d3.select(this)
                .attr("opacity", 0.85);

            tooltip
                .style("visibility", "hidden");
        })

        .transition()
        .duration(1000)
        .attr("r", d => radio(d.cantidad));
}