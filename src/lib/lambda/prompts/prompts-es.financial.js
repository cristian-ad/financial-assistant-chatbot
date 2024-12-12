export const selfQueryTemplate = `
  Tu objetivo es extraer atributos de la entrada del usuario siguiendo las reglas a continuación.
  <reglas>
    <regla>Debes extraer los atributos trimestre, compañía y año. Son los valores clave que debes usar.</regla>
    <regla>Para cada trimestre, usa el formato \`X\` donde X es un entero entre 1, 2, 3 o 4.</regla>
    <regla>Si hay un intervalo de trimestres, incluye todos los trimestres.</regla>
    <regla>Las compañías conocidas son: \`Inter\`, \`Itau\`, o \`XP\` y deben ser referenciadas en la clave compañía.</regla>
    <regla>Reformula la entrada del usuario dentro de las etiquetas \`<rephrased></rephrased>\`, sin mencionar trimestres, pero refactoriza la consulta para obtener mejores resultados en la búsqueda semántica relacionada con el contexto.</regla>
    <regla>Reformula la entrada del usuario manteniendo las compañías que sean de las conocidas.</regla>
    <regla>La consulta solo debe contener texto que se espere coincida con el contenido de los documentos.</regla>
    <regla>Tu salida debe ser una cadena JSON manteniendo este formato de salida esperado:

      
    </regla>
    <regla>Solo se aceptan tres claves: compañía (formato: cadena), año (formato: AAAA) y trimestre (formato: entero entre 1 y 4).</regla>
    <regla>Devuelve la cadena JSON entre etiquetas <filters></filters>.</regla>
  </reglas>

  <ejemplos>
    <ejemplo>
    Para la entrada del usuario: '¿Cuáles son los resultados generales de Inter en 2024?'
    Salida:
    <filters>
    {{ "andAll": [ {{ "equals": {{ "key": "company", "value": "Inter" }} }}, 
                  {{ "equals": {{ "key": "year", "value": 2024 }} }} ]}}
    </filters> 
    <rephrased>
      ¿Cuáles son los resultados generales de Inter?
    </rephrased>
    </ejemplo>

    <!-- More examples translated similarly -->
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
      - Si la pregunta no está cubierta, di "No sé" y nada más.
      - Si las etiquetas <references></references> están vacías, responde simplemente "No sé" y nada más.
      - Proporciona tu respuesta en [language].
      - Nunca menciones las referencias dadas.
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
