export const retrievalFilters = { // Unión de filtros de recuperación: solo una clave presente
    equals: { // Atributo de filtro
        key: "VALOR_STRING", // requerido
        value: "VALOR_DOCUMENTO" // requerido
    },
    notEquals: {
        key: "VALOR_STRING", // requerido
        value: "VALOR_DOCUMENTO" // requerido
    },
    greaterThan: {
        key: "VALOR_STRING", // requerido
        value: "VALOR_DOCUMENTO" // requerido
    },
    greaterThanOrEquals: {
        key: "VALOR_STRING", // requerido
        value: "VALOR_DOCUMENTO" // requerido
    },
    lessThan: {
        key: "VALOR_STRING", // requerido
        value: "VALOR_DOCUMENTO" // requerido
    },
    lessThanOrEquals: "<AtributoDeFiltro>",
    in: "<AtributoDeFiltro>",
    notIn: "<AtributoDeFiltro>",
    startsWith: "<AtributoDeFiltro>",
    listContains: "<AtributoDeFiltro>",
    stringContains: "<AtributoDeFiltro>",
    andAll: [ // Lista de filtros de recuperación
        { // Unión: solo una clave presente
            equals: "<AtributoDeFiltro>",
            notEquals: "<AtributoDeFiltro>",
            greaterThan: "<AtributoDeFiltro>",
            greaterThanOrEquals: "<AtributoDeFiltro>",
            lessThan: "<AtributoDeFiltro>",
            lessThanOrEquals: "<AtributoDeFiltro>",
            in: "<AtributoDeFiltro>",
            notIn: "<AtributoDeFiltro>",
            startsWith: "<AtributoDeFiltro>",
            listContains: "<AtributoDeFiltro>",
            stringContains: "<AtributoDeFiltro>",
            andAll: [
                "<FiltroDeRecuperación>"
            ],
            orAll: [
                "<FiltroDeRecuperación>"
            ],
        },
    ],
    orAll: [
        "<FiltroDeRecuperación>"
    ],
}