import { retrievalFilters } from './retrieval-filters.js';

const retrievalFiltersAsString = retrievalFilters;
console.log('Retrieval filters stringyfied', retrievalFiltersAsString);

export const selfQueryTemplate = `
  Tu objetivo es extraer atributos de la entrada del usuario siguiendo las reglas a continuación.
    <reglas>
    <regla>De los archivos CPT4 e ICD-10, deberás extraer información sobre la lista de diagnósticos, y sus códigos asociados.</regla>
    <regla>Del archivo Manual de Usuario Telemedicina Perfil Paciente deberás obtener información sobre las diferentes etapas del sistema. Cada una de las secciónes las podrás encontrar en las hojas 2 y 3 con el título de Contenidos, cada número representa una nueva sección</regla>

    <regla>Del archivo package - EANs con product y Sales deberías consultarlo como una base de datos donde cada columna es un campo y donde cada fila representa una entrada en la DB. Es una lista de medicamentos así que lo importante aquí sería poder hacer consultas sobre cada medicamento.</regla>

    <regla>Reformula la entrada del usuario dentro de las etiquetas \`<rephrased></rephrased>\`, refactoriza la consulta para obtener mejores resultados en la búsqueda semántica relacionada con el contexto.</regla>

    <regla>La consulta solo debe contener texto que se espere coincida con el contenido de los documentos.</regla>
    <regla>Tu salida debe ser una cadena JSON manteniendo este formato de salida esperado: ${retrievalFiltersAsString} </regla>
    <regla>Devuelve la cadena JSON entre etiquetas <filters></filters>.</regla>
  </reglas>

  <ejemplos>
    <ejemplo>
    Para la entrada del usuario: '¿Cuáles son los tipos de medicamentos que vienen en formato inyectable?'
    Salida:
    <filters>
      {{ "andAll": 
        [ 
          {{ "equals": 
            {{ "key": "company", "value": "Inter" }} 
          }}, 
          {{ "equals": 
            {{ "key": "name", "value": 2024 }} 
          }} 
        ]
      }}
    </filters> 
    <rephrased>
      ¿Qué medicamentos pueden ser inyectables?
    </rephrased>
    </ejemplo>

  </ejemplos>

  Devuelve solo el contenido solicitado entre las etiquetas <filters></filters> y \`<rephrased></rephrased>\`.

  Esta es la pregunta del usuario:
  <question>{question}</question>
`;

export const chatTemplate = `
      Eres un asistente de chat. Debes ser claro y educado con el usuario.
      Esta fue la consulta del usuario para ti:
      <query>
        {query}
      </query>
      
      Responde basándote solo en estas referencias:
      <references>
        {references}
      </references>
      
      Me gustaría que respondieras siguiendo estas instrucciones:

      <instructions>
      - Responde solo preguntas cubiertas por contenido dentro de las etiquetas <references></references>.
      - Si la pregunta no está cubierta, devuelve respuestas diciendo que no sabes y nada más.
      - Si las etiquetas <references></references> están vacías, devuelve respuestas diciendo que no sabes y nada más.
      - Proporciona tu respuesta en español.
      - Menciona las referencias dadas, en cuanto al archivo y el punto de dónde obtuviste la información
      - Sé conciso y evita detalles innecesarios.
      </instructions>
`;

export const condenseTemplate = `
Humano: Reformula la pregunta entre las etiquetas <question></question> considerando el historial de la conversación entre las etiquetas <history></history>. 

Proporciona solo la pregunta reformulada.
  <history>
    {chatHistory}
  </history>

  <question>
    {question}
  </question>
`;
