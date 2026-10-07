// ==========================================
// TOP 10 PRODUCTOS MÁS VENDIDOS - D3.JS
// ==========================================

// Dimensiones del gráfico
const margin = {
    top: 60,
    right: 40,
    bottom: 60,
    left: 220
};

const width = 1000;
const height = 600;

// Cargar el archivo JSON
d3.json("data/resultado_fusionado.json")
    .then(data => {

        // ==========================================
        // 1. EXTRAER TODOS LOS ARTÍCULOS
        // ==========================================

        const productos = [];

        data.clientes.forEach(cliente => {

            // Verificamos que el cliente tenga compras
            if (cliente.compras) {

                cliente.compras.forEach(compra => {

                    // Verificamos que la compra tenga artículos
                    if (compra.articulos) {

                        compra.articulos.forEach(articulo => {

                            productos.push({
                                nombre: articulo.nombre,
                                cantidad: Number(articulo.cantidad)
                            });

                        });

                    }

                });

            }

        });


        // ==========================================
        // 2. SUMAR LA CANTIDAD DE CADA PRODUCTO
        // ==========================================

        const productosAgrupados = d3.rollup(
            productos,
            valores => d3.sum(valores, d => d.cantidad),
            d => d.nombre
        );


        // ==========================================
        // 3. CONVERTIR LOS DATOS A UN ARRAY
        // ==========================================

        const datos = Array.from(
            productosAgrupados,
            ([nombre, cantidad]) => ({
                nombre: nombre,
                cantidad: cantidad
            })
        );


        // ==========================================
        // 4. ORDENAR DE MAYOR A MENOR
        // ==========================================

        datos.sort((a, b) => b.cantidad - a.cantidad);


        // ==========================================
        // 5. SELECCIONAR EL TOP 10
        // ==========================================

        const top10 = datos.slice(0, 10);


        // Mostrar los datos en la consola
        console.log("Top 10 productos más vendidos:");
        console.table(top10);


        // ==========================================
        // 6. CREAR EL CONTENEDOR DEL GRÁFICO
        // ==========================================

        const contenedor = d3.select("#grafico");

        // Si no existe #grafico en el HTML, lo creamos
        if (contenedor.empty()) {
            d3.select("body")
                .append("div")
                .attr("id", "grafico");
        }


        // ==========================================
        // 7. CREAR EL SVG
        // ==========================================

        const svg = d3.select("#grafico")
            .append("svg")
            .attr("width", width)
            .attr("height", height);


        // Grupo principal respetando los márgenes
        const chart = svg.append("g")
            .attr(
                "transform",
                `translate(${margin.left},${margin.top})`
            );


        // ==========================================
        // 8. ESCALA X
        // ==========================================

        const x = d3.scaleLinear()
            .domain([0, d3.max(top10, d => d.cantidad)])
            .nice()
            .range([0, width - margin.left - margin.right]);


        // ==========================================
        // 9. ESCALA Y
        // ==========================================

        const y = d3.scaleBand()
            .domain(top10.map(d => d.nombre))
            .range([0, height - margin.top - margin.bottom])
            .padding(0.2);


        // ==========================================
        // 10. EJE X
        // ==========================================

        chart.append("g")
            .attr(
                "transform",
                `translate(0,${height - margin.top - margin.bottom})`
            )
            .call(d3.axisBottom(x).ticks(8));


        // ==========================================
        // 11. EJE Y
        // ==========================================

        chart.append("g")
            .call(d3.axisLeft(y));


        // ==========================================
        // 12. BARRAS
        // ==========================================

        chart.selectAll(".barra")
            .data(top10)
            .enter()
            .append("rect")
            .attr("class", "barra")
            .attr("y", d => y(d.nombre))
            .attr("x", 0)
            .attr("height", y.bandwidth())
            .attr("width", d => x(d.cantidad));


        // ==========================================
        // 13. VALORES AL FINAL DE CADA BARRA
        // ==========================================

        chart.selectAll(".valor")
            .data(top10)
            .enter()
            .append("text")
            .attr("class", "valor")
            .attr("x", d => x(d.cantidad) + 8)
            .attr("y", d => y(d.nombre) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .text(d => d.cantidad);


        // ==========================================
        // 14. TÍTULO DEL GRÁFICO
        // ==========================================

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "22px")
            .style("font-weight", "bold")
            .text("Top 10 de productos más vendidos");


        // ==========================================
        // 15. TÍTULO DEL EJE X
        // ==========================================

        svg.append("text")
            .attr("x", margin.left + (width - margin.left - margin.right) / 2)
            .attr("y", height - 10)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Cantidad de unidades vendidas");


        // ==========================================
        // 16. TÍTULO DEL EJE Y
        // ==========================================

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height / 2))
            .attr("y", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Producto");

    })

    // ==========================================
    // MANEJO DE ERRORES
    // ==========================================

    .catch(error => {

        console.error(
            "Error al cargar resultado_fusionado.json:",
            error
        );

        d3.select("#grafico")
            .append("p")
            .style("color", "red")
            .text(
                "No se pudo cargar el archivo resultado_fusionado.json."
            );
    });
