/**
 * @name IA knmollpy
 * @version 13.2.0
 * @description
 * IA knmollpy - Chat multi-IA para Pengu Loader.
 *
 * PROVEEDORES:
 * - Google Gemini Free Tier
 * - Groq Free Plan
 * - OpenRouter Free
 *
 * FUNCIONES:
 * - Agregar API + detectar
 * - Solo modelos gratuitos
 * - Detección automática
 * - Indicador de soporte de imágenes
 * - Streaming
 * - Imágenes compatibles
 * - Historial local
 * - Contador de uso
 * - Exportar conversación a TXT
 * - Múltiples APIs
 * - Cambio de proveedor/modelo
 * - GitHub
 * - FAB abajo a la izquierda
 * - Ctrl + K
 *
 * NO INCLUYE API KEYS.
 */

"use strict";


/* ============================================================
   PROYECTO
   ============================================================ */

const PROJECT_NAME =
  "IA knmollpy";

const GITHUB_URL =
  "https://github.com/knmollpy";


/* ============================================================
   STORAGE
   ============================================================ */

const CHAT_STORAGE_KEY =
  "pengu-ia-knmollpy-chat-v130";

const API_STORAGE_KEY =
  "pengu-ia-knmollpy-apis-v130";

const USAGE_STORAGE_KEY =
  "pengu-ia-knmollpy-usage-v130";


/* ============================================================
   FAB
   ============================================================ */

const FAB_ID =
  "ia-knmollpy-fab";


/* ============================================================
   ESTADO
   ============================================================ */

let isOpen =
  false;

let isStreaming =
  false;

let currentApiId =
  null;

let currentModelId =
  null;

let history =
  [];

let uiMessages =
  [];

let currentImages =
  [];

let streamText =
  "";

let streamError =
  null;

let fabTimer =
  null;

let fabEventsBound =
  false;

let commandBarRegistered =
  false;

let ignoreOverlayCloseUntil =
  0;

let lastFabToggleAt =
  0;


/* ============================================================
   GEMINI - FREE
   ============================================================ */

const GEMINI_FREE_MODELS = {

  "gemini-3.7-flash": {

    free:
      true,

    dailyEstimate:
      null,

    supportsImage:
      true,

    note:
      "Free Tier; cuota variable según proyecto."

  },


  "gemini-3.6-flash": {

    free:
      true,

    dailyEstimate:
      null,

    supportsImage:
      true,

    note:
      "Free Tier; cuota variable según proyecto."

  },


  "gemini-3.5-flash": {

    free:
      true,

    dailyEstimate:
      null,

    supportsImage:
      true,

    note:
      "Free Tier; cuota variable según proyecto."

  },


  "gemini-3.5-flash-lite": {

    free:
      true,

    dailyEstimate:
      null,

    supportsImage:
      true,

    note:
      "Free Tier; cuota variable según proyecto."

  },


  "gemini-3.1-flash-lite": {

    free:
      true,

    dailyEstimate:
      null,

    supportsImage:
      true,

    note:
      "Free Tier; cuota variable según proyecto."

  }

};


/* ============================================================
   GROQ - FREE
   ============================================================ */

const GROQ_FREE_MODELS = {

  "openai/gpt-oss-120b": {

    free:
      true,

    dailyEstimate:
      1000,

    supportsImage:
      false,

    note:
      "Free Plan; referencia de RPD publicada."

  },


  "openai/gpt-oss-20b": {

    free:
      true,

    dailyEstimate:
      1000,

    supportsImage:
      false,

    note:
      "Free Plan; referencia de RPD publicada."

  },


  "openai/gpt-oss-safeguard-20b": {

    free:
      true,

    dailyEstimate:
      1000,

    supportsImage:
      false,

    note:
      "Free Plan; referencia de RPD publicada."

  },


  "qwen/qwen3.6-27b": {

    free:
      true,

    dailyEstimate:
      1000,

    supportsImage:
      false,

    note:
      "Free Plan; referencia de RPD publicada."

  },


  "qwen/qwen3.8-27b": {

    free:
      true,

    dailyEstimate:
      1000,

    supportsImage:
      false,

    note:
      "Free Plan; referencia de RPD publicada."

  }

};


/* ============================================================
   OPENROUTER
   ============================================================ */

const OPENROUTER_FREE_DAILY =
  50;


/* ============================================================
   UTILIDADES
   ============================================================ */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#39;"
    );

}


function uid(
  prefix = "id"
) {

  return (

    prefix +

    "-" +

    Date.now().toString(36) +

    "-" +

    Math.random()
      .toString(36)
      .slice(
        2,
        10
      )

  );

}


function maskKey(
  key
) {

  const value =
    String(
      key || ""
    );


  if (
    value.length <=
    8
  ) {

    return "••••••••";

  }


  return (

    value.slice(
      0,
      4
    ) +

    "••••••••" +

    value.slice(
      -4
    )

  );

}


async function safeReadText(
  response
) {

  try {

    return await response.text();

  } catch {

    return "";

  }

}


function extractApiMessage(
  text
) {

  if (!text) {

    return "";

  }


  try {

    const data =
      JSON.parse(
        text
      );


    return (

      data.error?.message ||

      data.message ||

      text

    );

  } catch {

    return text;

  }

}


async function readError(
  response
) {

  const text =
    await safeReadText(
      response
    );


  const message =
    extractApiMessage(
      text
    );


  return (

    `HTTP ${response.status}` +

    (

      message
        ? `: ${message}`
        : ""

    )

  );

}


/* ============================================================
   MARKDOWN
   ============================================================ */

function loadLibs() {

  if (
    window.marked
  ) {

    return;

  }


  try {

    const script =
      document.createElement(
        "script"
      );


    script.src =
      "https://cdn.jsdelivr.net/npm/marked/marked.min.js";


    script.onload =
      () => {

        try {

          if (
            window.marked
          ) {

            marked.setOptions({

              breaks:
                true,

              gfm:
                true

            });

          }

        } catch {}

      };


    script.onerror =
      () => {};


    document.head.appendChild(
      script
    );

  } catch {}

}


function renderMarkdown(
  text
) {

  if (
    !window.marked
  ) {

    return escapeHtml(
      text
    );

  }


  try {

    return marked.parse(
      text ||
      ""
    );

  } catch {

    return escapeHtml(
      text
    );

  }

}


/* ============================================================
   STORAGE - APIS
   ============================================================ */

function loadApis() {

  try {

    const raw =
      localStorage.getItem(
        API_STORAGE_KEY
      );


    if (!raw) {

      return [];

    }


    const data =
      JSON.parse(
        raw
      );


    return Array.isArray(
      data
    )

      ? data

      : [];

  } catch {

    return [];

  }

}


function saveApis(
  apis
) {

  try {

    localStorage.setItem(

      API_STORAGE_KEY,

      JSON.stringify(
        apis
      )

    );

  } catch (
    error
  ) {

    console.error(

      `[${PROJECT_NAME}] Error guardando APIs:`,

      error

    );

  }

}


function getCurrentApi() {

  return (

    loadApis().find(
      api =>
        api.id ===
        currentApiId
    )

    ||

    null

  );

}


function getCurrentModel() {

  const api =
    getCurrentApi();


  if (!api) {

    return null;

  }


  return (

    api.models ||
    []

  ).find(

    model =>
      model.id ===
      currentModelId

  )

  || null;

}


/* ============================================================
   CHAT STORAGE
   ============================================================ */

function loadState() {

  try {

    const raw =
      localStorage.getItem(
        CHAT_STORAGE_KEY
      );


    if (!raw) {

      return;

    }


    const data =
      JSON.parse(
        raw
      );


    if (
      Array.isArray(
        data.history
      )
    ) {

      history =
        data.history;

    }


    if (
      Array.isArray(
        data.uiMessages
      )
    ) {

      uiMessages =
        data.uiMessages;

    }


    currentApiId =
      data.currentApiId ||
      null;


    currentModelId =
      data.currentModelId ||
      null;


  } catch (
    error
  ) {

    console.error(

      `[${PROJECT_NAME}] Error cargando estado:`,

      error

    );

  }

}


function saveState() {

  try {

    localStorage.setItem(

      CHAT_STORAGE_KEY,

      JSON.stringify({

        history,

        uiMessages,

        currentApiId,

        currentModelId

      })

    );

  } catch (
    error
  ) {

    console.error(

      `[${PROJECT_NAME}] Error guardando estado:`,

      error

    );

  }

}


/* ============================================================
   USAGE
   ============================================================ */

function todayKey() {

  const d =
    new Date();


  return (

    d.getFullYear() +

    "-" +

    String(
      d.getMonth() + 1
    )
      .padStart(
        2,
        "0"
      ) +

    "-" +

    String(
      d.getDate()
    )
      .padStart(
        2,
        "0"
      )

  );

}


function loadUsage() {

  try {

    const raw =
      localStorage.getItem(
        USAGE_STORAGE_KEY
      );


    if (!raw) {

      return {

        day:
          todayKey(),

        counts:
          {}

      };

    }


    const data =
      JSON.parse(
        raw
      );


    if (

      !data ||

      data.day !==
        todayKey()

    ) {

      return {

        day:
          todayKey(),

        counts:
          {}

      };

    }


    if (!data.counts) {

      data.counts =
        {};

    }


    return data;

  } catch {

    return {

      day:
        todayKey(),

      counts:
        {}

    };

  }

}


function saveUsage(
  data
) {

  try {

    localStorage.setItem(

      USAGE_STORAGE_KEY,

      JSON.stringify(
        data
      )

    );

  } catch {}

}


function usageKey() {

  return (

    String(
      currentApiId
    ) +

    ":" +

    String(
      currentModelId
    )

  );

}


function getUsage() {

  const data =
    loadUsage();


  return Number(

    data.counts[
      usageKey()
    ] ||

    0

  );

}


function incrementUsage() {

  const data =
    loadUsage();


  data.counts[
    usageKey()
  ] =

    getUsage() +
    1;


  saveUsage(
    data
  );

}


/* ============================================================
   ARCHIVOS / IMAGENES
   ============================================================ */

function readFileAsBase64(
  file
) {

  return new Promise(

    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () => {

          const result =
            String(
              reader.result ||
              ""
            );


          resolve(

            result.split(
              ","
            )[1] ||

            ""

          );

        };


      reader.onerror =
        reject;


      reader.readAsDataURL(
        file
      );

    }

  );

}


function guessImageMime(
  filename
) {

  const name =
    String(
      filename ||
      ""
    )
      .toLowerCase();


  if (
    name.endsWith(
      ".png"
    )
  ) {

    return "image/png";

  }


  if (
    name.endsWith(
      ".jpg"
    ) ||
    name.endsWith(
      ".jpeg"
    )
  ) {

    return "image/jpeg";

  }


  if (
    name.endsWith(
      ".webp"
    )
  ) {

    return "image/webp";

  }


  if (
    name.endsWith(
      ".gif"
    )
  ) {

    return "image/gif";

  }


  if (
    name.endsWith(
      ".heic"
    )
  ) {

    return "image/heic";

  }


  if (
    name.endsWith(
      ".heif"
    )
  ) {

    return "image/heif";

  }


  return "image/jpeg";

}


async function createImageAttachment(
  file
) {

  const allowedTypes = [

    "image/png",

    "image/jpeg",

    "image/webp",

    "image/gif",

    "image/heic",

    "image/heif"

  ];


  const extensionAllowed =

    /\.(png|jpe?g|webp|gif|heic|heif)$/i
      .test(
        file.name || ""
      );


  if (

    !allowedTypes.includes(
      file.type
    )

    &&

    !extensionAllowed

  ) {

    throw new Error(

      `Formato no compatible: ${file.name}`

    );

  }


  const MAX_IMAGE_SIZE =
    20 * 1024 * 1024;


  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {

    throw new Error(

      "La imagen supera el límite local de 20 MB."

    );

  }


  const data =
    await readFileAsBase64(
      file
    );


  return {

    id:
      uid("image"),

    file,

    name:
      file.name,

    mimeType:
      file.type ||
      guessImageMime(
        file.name
      ),

    data

  };

}


/* ============================================================
   GEMINI PROVIDER
   ============================================================ */

const GeminiProvider = {

  id:
    "gemini",

  name:
    "Google Gemini Free",


  async requestModels(
    key
  ) {

    const cleanKey =
      String(
        key || ""
      )
        .trim();


    if (!cleanKey) {

      throw new Error(
        "La API Key está vacía."
      );

    }


    let response;


    try {

      response =
        await fetch(

          "https://generativelanguage.googleapis.com/v1beta/models",

          {

            method:
              "GET",

            headers: {

              "Accept":
                "application/json",

              "x-goog-api-key":
                cleanKey

            }

          }

        );

    } catch (
      error
    ) {

      throw new Error(

        "No se pudo conectar con Google Gemini: " +

        (
          error?.message ||
          String(error)
        )

      );

    }


    if (
      response.ok
    ) {

      return await response.json();

    }


    const firstBody =
      await safeReadText(
        response
      );


    let fallback;


    try {

      fallback =
        await fetch(

          "https://generativelanguage.googleapis.com/v1beta/models?key=" +

          encodeURIComponent(
            cleanKey
          )

        );

    } catch (
      error
    ) {

      throw new Error(

        "Google rechazó la autenticación por header y el segundo intento falló: " +

        (
          error?.message ||
          String(error)
        )

      );

    }


    if (
      fallback.ok
    ) {

      return await fallback.json();

    }


    const secondBody =
      await safeReadText(
        fallback
      );


    throw new Error(

      "Google rechazó la API Key.\n\n" +

      `Primer intento HTTP ${response.status}` +

      (

        firstBody
          ? `: ${extractApiMessage(firstBody)}`
          : ""

      ) +

      "\n" +

      `Segundo intento HTTP ${fallback.status}` +

      (

        secondBody
          ? `: ${extractApiMessage(secondBody)}`
          : ""

      )

    );

  },


  async detect(
    key
  ) {

    const data =
      await this.requestModels(
        key
      );


    const models =
      [];


    for (
      const rawModel
      of data.models || []
    ) {

      const id =
        String(
          rawModel.name ||
          ""
        )
          .replace(
            /^models\//,
            ""
          );


      const meta =
        GEMINI_FREE_MODELS[
          id
        ];


      if (!meta) {

        continue;

      }


      const methods =
        rawModel
          .supportedGenerationMethods ||
        [];


      if (
        !methods.includes(
          "generateContent"
        )
      ) {

        continue;

      }


      const inputModalities =
        rawModel
          .inputModalities ||
        rawModel
          .architecture
          ?.input_modalities ||
        [];


      const dynamicImageSupport =

        Array.isArray(
          inputModalities
        )

        &&

        inputModalities.includes(
          "image"
        );


      models.push({

        id,

        name:
          rawModel.displayName ||
          id,

        free:
          true,

        dailyEstimate:
          meta.dailyEstimate,

        supportsImage:

          inputModalities.length
            ? dynamicImageSupport
            : meta.supportsImage,

        note:
          meta.note

      });

    }


    if (!models.length) {

      throw new Error(

        "La API de Google respondió correctamente, pero no encontré modelos Gemini gratuitos compatibles."

      );

    }


    return models;

  },


  async send({

    key,

    model,

    chatHistory,

    prompt,

    images,

    onChunk

  }) {

    const cleanModel =
      String(
        model || ""
      )
        .replace(
          /^models\//,
          ""
        );


    const meta =
      GEMINI_FREE_MODELS[
        cleanModel
      ];


    if (!meta) {

      throw new Error(

        `Modelo Gemini no permitido: ${cleanModel}`

      );

    }


    if (
      images?.length &&
      meta.supportsImage !==
        true
    ) {

      throw new Error(

        "El modelo seleccionado no admite imágenes."

      );

    }


    const contents =
      [];


    for (
      const message
      of chatHistory
    ) {

      contents.push({

        role:

          message.role ===
            "assistant"

            ? "model"

            : "user",

        parts:
          message.parts ||
          []

      });

    }


    const parts =
      [];


    if (prompt) {

      parts.push({

        text:
          prompt

      });

    }


    for (
      const image
      of images || []
    ) {

      if (!image.data) {

        image.data =
          await readFileAsBase64(
            image.file
          );

      }


      parts.push({

        inline_data: {

          mime_type:
            image.mimeType,

          data:
            image.data

        }

      });

    }


    contents.push({

      role:
        "user",

      parts

    });


    const endpoint =

      "https://generativelanguage.googleapis.com/v1beta/models/" +

      encodeURIComponent(
        cleanModel
      ) +

      ":streamGenerateContent";


    const response =
      await fetch(

        endpoint +
        "?alt=sse",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "text/event-stream",

            "x-goog-api-key":
              key

          },

          body:
            JSON.stringify({

              contents,

              generationConfig: {

                maxOutputTokens:
                  8192

              }

            })

        }

      );


    if (!response.ok) {

      throw new Error(
        await readError(
          response
        )
      );

    }


    return readGeminiStream(

      response,

      onChunk

    );

  }

};


/* ============================================================
   GROQ PROVIDER
   ============================================================ */

const GroqProvider = {

  id:
    "groq",

  name:
    "Groq Free",


  async detect(
    key
  ) {

    const cleanKey =
      String(
        key || ""
      )
        .trim();


    const response =
      await fetch(

        "https://api.groq.com/openai/v1/models",

        {

          method:
            "GET",

          headers: {

            "Authorization":
              "Bearer " +
              cleanKey

          }

        }

      );


    if (!response.ok) {

      throw new Error(
        await readError(
          response
        )
      );

    }


    const data =
      await response.json();


    const models =
      (
        data.data ||
        []
      )

        .filter(
          model =>
            Object.prototype
              .hasOwnProperty.call(
                GROQ_FREE_MODELS,
                model.id
              )
        )

        .map(
          model => {

            const meta =
              GROQ_FREE_MODELS[
                model.id
              ];


            return {

              id:
                model.id,

              name:
                model.id,

              free:
                true,

              dailyEstimate:
                meta.dailyEstimate,

              supportsImage:
                meta.supportsImage,

              note:
                meta.note

            };

          }

        );


    if (!models.length) {

      throw new Error(

        "La clave es válida, pero Groq no devolvió modelos gratuitos compatibles."

      );

    }


    return models;

  },


  async send({

    key,

    model,

    chatHistory,

    prompt,

    images,

    onChunk

  }) {

    if (
      images?.length
    ) {

      throw new Error(

        "El modelo Groq seleccionado no admite imágenes."

      );

    }


    if (
      !GROQ_FREE_MODELS[
        model
      ]
    ) {

      throw new Error(

        `Modelo Groq no permitido: ${model}`

      );

    }


    const messages =
      chatHistory.map(
        message => ({

          role:

            message.role ===
              "assistant"

              ? "assistant"

              : "user",

          content:

            (
              message.parts ||
              []
            )

              .map(
                part =>
                  part.text ||
                  ""
              )

              .join("")

        })

      );


    messages.push({

      role:
        "user",

      content:
        prompt

    });


    const response =
      await fetch(

        "https://api.groq.com/openai/v1/chat/completions",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              "Bearer " +
              key

          },

          body:
            JSON.stringify({

              model,

              messages,

              stream:
                true

            })

        }

      );


    if (!response.ok) {

      throw new Error(
        await readError(
          response
        )
      );

    }


    return readOpenAIStream(

      response,

      onChunk

    );

  }

};


/* ============================================================
   OPENROUTER PROVIDER
   ============================================================ */

const OpenRouterProvider = {

  id:
    "openrouter",

  name:
    "OpenRouter Free",


  async detect(
    key
  ) {

    const cleanKey =
      String(
        key || ""
      )
        .trim();


    const response =
      await fetch(

        "https://openrouter.ai/api/v1/models",

        {

          method:
            "GET",

          headers: {

            "Authorization":
              "Bearer " +
              cleanKey,

            "Accept":
              "application/json"

          }

        }

      );


    if (!response.ok) {

      throw new Error(
        await readError(
          response
        )
      );

    }


    const data =
      await response.json();


    const models =
      [];


    for (
      const rawModel
      of data.data || []
    ) {

      const id =
        String(
          rawModel.id ||
          ""
        );


      const promptPrice =
        Number(
          rawModel.pricing?.prompt ||
          0
        );


      const completionPrice =
        Number(
          rawModel.pricing?.completion ||
          0
        );


      const isFree =

        (

          promptPrice ===
            0 &&

          completionPrice ===
            0

        )

        ||

        id.endsWith(
          ":free"
        );


      if (!isFree) {

        continue;

      }


      const inputModalities =
        rawModel
          .architecture
          ?.input_modalities;


      const supportsImage =

        Array.isArray(
          inputModalities
        )

        &&

        inputModalities.includes(
          "image"
        );


      if (

        Array.isArray(
          inputModalities
        )

        &&

        inputModalities.length

        &&

        !inputModalities.includes(
          "text"
        )

      ) {

        continue;

      }


      models.push({

        id,

        name:
          rawModel.name ||
          id,

        free:
          true,

        dailyEstimate:
          OPENROUTER_FREE_DAILY,

        supportsImage,

        inputModalities:

          Array.isArray(
            inputModalities
          )

            ? inputModalities

            : ["text"],

        note:
          "OpenRouter Free: referencia de 50 requests/día."

      });

    }


    if (
      !models.some(
        model =>
          model.id ===
          "openrouter/free"
      )
    ) {

      models.unshift({

        id:
          "openrouter/free",

        name:
          "OpenRouter Free Router",

        free:
          true,

        dailyEstimate:
          OPENROUTER_FREE_DAILY,

        supportsImage:
          false,

        inputModalities:
          ["text"],

        note:
          "Router gratuito. Para imágenes elegí un modelo que indique ✅ imágenes."

      });

    }


    if (!models.length) {

      throw new Error(

        "La clave es válida, pero OpenRouter no devolvió modelos gratuitos compatibles."

      );

    }


    return models;

  },


  async send({

    key,

    model,

    chatHistory,

    prompt,

    images,

    onChunk

  }) {

    const apiModel =
      (
        getCurrentApi()
          ?.models ||
        []
      )
        .find(
          item =>
            item.id ===
            model
        );


    if (

      images?.length &&

      apiModel &&

      apiModel.supportsImage !==
        true

    ) {

      throw new Error(

        "El modelo seleccionado no admite imágenes. Elegí arriba uno marcado como ✅ imágenes."

      );

    }


    const messages =
      chatHistory.map(
        message => ({

          role:

            message.role ===
              "assistant"

              ? "assistant"

              : "user",

          content:

            (
              message.parts ||
              []
            )

              .map(
                part =>
                  part.text ||
                  ""
              )

              .join("")

        })

      );


    let content =
      prompt;


    if (
      images?.length
    ) {

      content = [

        {

          type:
            "text",

          text:
            prompt

        }

      ];


      for (
        const image
        of images
      ) {

        if (!image.data) {

          image.data =
            await readFileAsBase64(
              image.file
            );

        }


        content.push({

          type:
            "image_url",

          image_url: {

            url:

              `data:${image.mimeType};base64,${image.data}`

          }

        });

      }

    }


    messages.push({

      role:
        "user",

      content

    });


    const response =
      await fetch(

        "https://openrouter.ai/api/v1/chat/completions",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              "Bearer " +
              key

          },

          body:
            JSON.stringify({

              model,

              messages,

              stream:
                true

            })

        }

      );


    if (!response.ok) {

      throw new Error(
        await readError(
          response
        )
      );

    }


    return readOpenAIStream(

      response,

      onChunk

    );

  }

};


/* ============================================================
   PROVIDERS
   ============================================================ */

const PROVIDERS = [

  GeminiProvider,

  GroqProvider,

  OpenRouterProvider

];


/* ============================================================
   DETECCION DEL PROVEEDOR
   ============================================================ */

async function detectProvider(
  sourceUrl,
  key
) {

  const source =
    String(
      sourceUrl || ""
    )
      .trim()
      .toLowerCase();


  if (

    source.includes(
      "aistudio.google.com"
    )

    ||

    source.includes(
      "ai.google.dev"
    )

    ||

    source.includes(
      "generativelanguage.googleapis.com"
    )

  ) {

    return {

      provider:
        GeminiProvider,

      models:
        await GeminiProvider.detect(
          key
        )

    };

  }


  if (

    source.includes(
      "console.groq.com"
    )

    ||

    source.includes(
      "groq.com"
    )

  ) {

    return {

      provider:
        GroqProvider,

      models:
        await GroqProvider.detect(
          key
        )

    };

  }


  if (
    source.includes(
      "openrouter.ai"
    )
  ) {

    return {

      provider:
        OpenRouterProvider,

      models:
        await OpenRouterProvider.detect(
          key
        )

    };

  }


  const errors =
    [];


  for (
    const provider
    of PROVIDERS
  ) {

    try {

      const models =
        await provider.detect(
          key
        );


      if (
        models &&
        models.length
      ) {

        return {

          provider,

          models

        };

      }

    } catch (
      error
    ) {

      errors.push(

        provider.name +
        ": " +
        (
          error?.message ||
          String(error)
        )

      );

    }

  }


  throw new Error(

    "No se pudo identificar una API gratuita.\n\n" +

    errors.join(
      "\n"
    )

  );

}


/* ============================================================
   AGREGAR API
   ============================================================ */

async function addApiAndDetect() {

  const key =
    prompt(
      "API Key:"
    );


  if (
    key ===
    null
  ) {

    return false;

  }


  const sourceUrl =
    prompt(
      "URL donde obtuviste la API Key:"
    );


  if (
    sourceUrl ===
    null
  ) {

    return false;

  }


  const cleanKey =
    key.trim();


  const cleanUrl =
    sourceUrl.trim();


  if (!cleanKey) {

    alert(
      "No ingresaste ninguna API Key."
    );


    return false;

  }


  if (!cleanUrl) {

    alert(
      "No ingresaste ninguna URL."
    );


    return false;

  }


  setDetectionStatus(

    "Verificando API y buscando modelos gratuitos..."

  );


  try {

    /*
     * No se guarda la API hasta comprobarla.
     */

    const detected =
      await detectProvider(

        cleanUrl,

        cleanKey

      );


    if (
      !detected ||
      !detected.provider
    ) {

      throw new Error(

        "No se pudo determinar el proveedor."

      );

    }


    const freeModels =
      (
        detected.models ||
        []
      )
        .filter(
          model =>
            model.free ===
            true
        );


    if (!freeModels.length) {

      throw new Error(

        "La API es válida, pero no se encontraron modelos gratuitos compatibles."

      );

    }


    const existing =
      loadApis();


    if (
      existing.some(
        api =>
          api.key ===
          cleanKey
      )
    ) {

      clearDetectionStatus();


      alert(
        "Esa API Key ya está agregada."
      );


      return false;

    }


    const newApi = {

      id:
        uid("api"),

      key:
        cleanKey,

      sourceUrl:
        cleanUrl,

      providerId:
        detected.provider.id,

      providerName:
        detected.provider.name,

      models:
        freeModels,

      addedAt:
        Date.now()

    };


    existing.push(
      newApi
    );


    saveApis(
      existing
    );


    currentApiId =
      newApi.id;


    currentModelId =
      freeModels[0]?.id ||
      null;


    saveState();


    refreshOpenUI();


    /*
     * Cerrar únicamente después
     * de completar correctamente el proceso.
     */

    closeApiSettings();


    clearDetectionStatus();


    alert(

      "IA agregada correctamente.\n\n" +

      "Proveedor: " +

      newApi.providerName +

      "\nModelos gratuitos: " +

      freeModels.length +

      "\n\nModelo seleccionado:\n" +

      (
        freeModels[0]?.name ||
        freeModels[0]?.id ||
        "N/A"
      )

    );


    return true;


  } catch (
    error
  ) {

    clearDetectionStatus();


    const message =
      error?.message ||
      String(error);


    alert(

      "No se pudo agregar la API.\n\n" +

      message +

      "\n\nNo se guardó ninguna API."

    );


    console.error(

      `[${PROJECT_NAME}] Detección:`,

      error

    );


    return false;

  }

}


/* ============================================================
   ESTADO DE DETECCION
   ============================================================ */

function setDetectionStatus(
  message
) {

  const element =
    document.getElementById(
      "ai-detect-status"
    );


  if (!element) {
    return;
  }


  element.style.display =
    "block";


  element.textContent =
    message;

}


function clearDetectionStatus() {

  const element =
    document.getElementById(
      "ai-detect-status"
    );


  if (!element) {
    return;
  }


  element.style.display =
    "none";


  element.textContent =
    "";

}


/* ============================================================
   API SETTINGS
   ============================================================ */

function openApiSettings() {

  const settings =
    document.getElementById(
      "ai-settings"
    );


  if (!settings) {
    return;
  }


  settings.classList.add(
    "open"
  );


  renderApiSettings();

}


function closeApiSettings() {

  const settings =
    document.getElementById(
      "ai-settings"
    );


  if (!settings) {
    return;
  }


  settings.classList.remove(
    "open"
  );


  clearDetectionStatus();

}


function renderApiSettings() {

  const settings =
    document.getElementById(
      "ai-settings"
    );


  if (!settings) {
    return;
  }


  const apis =
    loadApis();


  settings.innerHTML = `

    <div
      style="
        color:#EAF2FF;
        font-size:13px;
        font-weight:900;
      "
    >
      ${PROJECT_NAME}
      · APIs gratuitas
    </div>


    <div
      style="
        color:#8FAED0;
        font-size:11px;
        line-height:1.5;
        margin-top:5px;
      "
    >
      Introducí API Key + URL de origen.
      Al detectar correctamente una IA, este
      panel se cierra automáticamente.
    </div>


    <div
      id="ai-detect-status"
      style="
        display:none;
        margin-top:9px;
        padding:8px;
        border:
          1px solid #1D4ED8;
        border-radius:7px;
        background:#0B1730;
        color:#93C5FD;
        font-size:11px;
      "
    >
    </div>


    <button
      id="ai-add-detect"
      type="button"
      style="
        margin-top:10px;

        background:
          linear-gradient(
            180deg,
            #3B82F6,
            #1D4ED8
          );

        color:#FFFFFF;

        border:
          1px solid #60A5FA;

        border-radius:8px;

        padding:8px 13px;

        cursor:pointer;

        font-weight:800;

        box-shadow:
          0 4px 15px
          rgba(29,78,216,.3);
      "
    >
      ＋ Agregar API y detectar
    </button>


    <div
      style="
        margin-top:10px;
        color:#8FAED0;
        font-size:11px;
      "
    >
      APIs guardadas:
      ${apis.length}
    </div>


    <div
      id="ai-api-list"
      style="
        margin-top:8px;
      "
    >
    </div>

  `;


  const addButton =
    document.getElementById(
      "ai-add-detect"
    );


  addButton.onclick =
    async () => {

      if (
        addButton.disabled
      ) {

        return;

      }


      addButton.disabled =
        true;


      addButton.style.opacity =
        "0.6";


      addButton.textContent =
        "Detectando...";


      const success =
        await addApiAndDetect();


      if (!success) {

        const currentButton =
          document.getElementById(
            "ai-add-detect"
          );


        if (currentButton) {

          currentButton.disabled =
            false;


          currentButton.style.opacity =
            "1";


          currentButton.textContent =
            "＋ Agregar API y detectar";

        }

      }

    };


  const list =
    document.getElementById(
      "ai-api-list"
    );


  for (
    const api
    of apis
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.style.cssText = `

      display:flex;

      align-items:center;

      gap:7px;

      padding:8px;

      margin-top:7px;

      background:#0A162B;

      border:
        1px solid #1D4ED8;

      border-radius:8px;

      font-size:11px;

    `;


    const info =
      document.createElement(
        "div"
      );


    info.style.flex =
      "1";


    const title =
      document.createElement(
        "div"
      );


    title.style.color =
      "#EAF2FF";


    title.style.fontWeight =
      "800";


    title.textContent =
      api.providerName ||
      "API";


    const subtitle =
      document.createElement(
        "div"
      );


    subtitle.style.color =
      "#7696B8";


    subtitle.style.marginTop =
      "3px";


    subtitle.textContent =

      `${api.models?.length || 0} modelos gratis · ${maskKey(api.key)}`;


    info.appendChild(
      title
    );


    info.appendChild(
      subtitle
    );


    row.appendChild(
      info
    );


    const useButton =
      document.createElement(
        "button"
      );


    useButton.type =
      "button";


    useButton.textContent =
      "Usar";


    useButton.style.cssText = `

      background:#2563EB;

      color:#FFFFFF;

      border:
        1px solid #3B82F6;

      border-radius:6px;

      padding:5px 8px;

      cursor:pointer;

      font-weight:700;

    `;


    useButton.onclick =
      () => {

        currentApiId =
          api.id;


        currentModelId =
          api.models?.[0]?.id ||
          null;


        saveState();


        closeApiSettings();


        refreshOpenUI();

      };


    row.appendChild(
      useButton
    );


    const deleteButton =
      document.createElement(
        "button"
      );


    deleteButton.type =
      "button";


    deleteButton.textContent =
      "X";


    deleteButton.style.cssText = `

      background:#7F1D1D;

      color:#FFFFFF;

      border:
        1px solid #991B1B;

      border-radius:6px;

      padding:5px 8px;

      cursor:pointer;

      font-weight:700;

    `;


    deleteButton.onclick =
      () => {

        const remaining =
          loadApis()
            .filter(
              item =>
                item.id !==
                api.id
            );


        saveApis(
          remaining
        );


        if (
          currentApiId ===
          api.id
        ) {

          currentApiId =
            remaining[0]?.id ||
            null;


          currentModelId =
            remaining[0]
              ?.models?.[0]
              ?.id ||
            null;


          saveState();

        }


        refreshOpenUI();


        renderApiSettings();

      };


    row.appendChild(
      deleteButton
    );


    list.appendChild(
      row
    );

  }

}


/* ============================================================
   EXPORTAR CHAT
   ============================================================ */

function exportChat() {

  try {

    let text =
      `=== ${PROJECT_NAME} ===\n`;


    text +=
      `Fecha: ${new Date().toLocaleString()}\n`;


    text +=
      "========================================\n\n";


    const api =
      getCurrentApi();


    const model =
      getCurrentModel();


    if (api) {

      text +=
        `IA: ${api.providerName || "N/A"}\n`;

    }


    if (model) {

      text +=
        `Modelo: ${model.name || model.id}\n`;

    }


    text +=
      "========================================\n\n";


    if (!uiMessages.length) {

      text +=
        "La conversación está vacía.\n";

    }


    for (
      const message
      of uiMessages
    ) {

      const author =
        message.who ===
          "user"

          ? "TÚ"

          : "IA";


      let content =
        String(
          message.content ||
          ""
        );


      if (
        message.isHtml
      ) {

        const temp =
          document.createElement(
            "div"
          );


        temp.innerHTML =
          content;


        content =
          temp.textContent ||
          temp.innerText ||
          "";

      }


      text +=
        `[${author}]\n`;


      text +=
        content.trim();


      text +=

        "\n\n----------------------------------------\n\n";

    }


    const blob =
      new Blob(

        [text],

        {
          type:
            "text/plain;charset=utf-8"
        }

      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;


    link.download =

      `IA-knmollpy-chat-${new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        )}.txt`;


    link.style.display =
      "none";


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      () => {

        URL.revokeObjectURL(
          url
        );

      },
      1000
    );


  } catch (
    error
  ) {

    console.error(

      `[${PROJECT_NAME}] Error exportando chat:`,

      error

    );


    alert(

      "No se pudo guardar la conversación.\n\n" +

      (
        error?.message ||
        String(error)
      )

    );

  }

}


/* ============================================================
   SEND MESSAGE
   ============================================================ */

async function sendMessage() {

  if (isStreaming) {
    return;
  }


  const input =
    document.getElementById(
      "ai-input"
    );


  if (!input) {
    return;
  }


  const text =
    input.value.trim();


  if (

    !text &&

    currentImages.length ===
      0

  ) {

    return;

  }


  const model =
    getCurrentModel();


  if (!model) {

    alert(

      "Primero seleccioná un modelo."

    );


    return;

  }


  if (

    currentImages.length &&

    model.supportsImage !==
      true

  ) {

    alert(

      "El modelo seleccionado no admite imágenes.\n\n" +

      "Elegí uno marcado con:\n" +

      "Imagen: ✅ Soporta imágenes"

    );


    return;

  }


  let displayText =
    text ||
    "Analizá la imagen adjunta.";


  if (
    currentImages.length
  ) {

    displayText +=

      "\n\n🖼 " +

      currentImages
        .map(
          image =>
            image.name
        )
        .join(
          ", "
        );

  }


  uiMessages.push({

    who:
      "user",

    content:
      displayText,

    isHtml:
      false

  });


  const imagesToSend =
    [
      ...currentImages
    ];


  currentImages =
    [];


  input.value =
    "";


  input.style.height =
    "auto";


  renderImagePreview();


  saveState();


  refreshOpenUI();


  await generate(

    text ||
    "Analizá la imagen adjunta.",

    imagesToSend

  );

}


/* ============================================================
   GENERATE
   ============================================================ */

async function generate(
  prompt,
  images
) {

  if (isStreaming) {
    return;
  }


  const api =
    getCurrentApi();


  if (!api) {

    openApiSettings();


    alert(

      "Primero agregá una API gratuita."

    );


    return;

  }


  const provider =
    PROVIDERS.find(
      item =>
        item.id ===
        api.providerId
    );


  if (!provider) {

    alert(
      "Proveedor no encontrado."
    );


    return;

  }


  const model =
    (
      api.models ||
      []
    ).find(
      item =>
        item.id ===
          currentModelId &&

        item.free ===
          true
    );


  if (!model) {

    alert(

      "El modelo seleccionado no es gratuito o ya no está disponible."

    );


    return;

  }


  if (

    images?.length &&

    model.supportsImage !==
      true

  ) {

    alert(

      "El modelo seleccionado no soporta imágenes."

    );


    return;

  }


  if (

    api.providerId ===
      "gemini"

    &&

    !GEMINI_FREE_MODELS[
      currentModelId
    ]

  ) {

    alert(
      "Modelo Gemini no permitido."
    );


    return;

  }


  if (

    api.providerId ===
      "groq"

    &&

    !GROQ_FREE_MODELS[
      currentModelId
    ]

  ) {

    alert(
      "Modelo Groq no permitido."
    );


    return;

  }


  isStreaming =
    true;


  streamText =
    "";


  streamError =
    null;


  incrementUsage();


  refreshOpenUI();


  try {

    const result =
      await provider.send({

        key:
          api.key,

        model:
          currentModelId,

        chatHistory:
          history,

        prompt,

        images,

        onChunk:
          partial => {

            streamText =
              partial;


            refreshOpenUI();

          }

      });


    history.push({

      role:
        "user",

      parts: [

        {
          text:
            prompt
        }

      ]

    });


    history.push({

      role:
        "assistant",

      parts: [

        {
          text:
            result
        }

      ]

    });


    if (
      history.length >
      40
    ) {

      history =
        history.slice(
          -40
        );

    }


    uiMessages.push({

      who:
        "bot",

      content:
        result,

      isHtml:
        false

    });


    saveState();


  } catch (
    error
  ) {

    const message =
      error?.message ||
      String(error);


    uiMessages.push({

      who:
        "bot",

      content:
        "❌ Error: " +
        message,

      isHtml:
        false

    });


    saveState();

  } finally {

    isStreaming =
      false;


    streamText =
      "";


    streamError =
      null;


    refreshOpenUI();

  }

}


/* ============================================================
   GEMINI STREAM
   ============================================================ */

async function readGeminiStream(
  response,
  onChunk
) {

  if (!response.body) {

    throw new Error(

      "Gemini no devolvió un stream."

    );

  }


  const reader =
    response.body.getReader();


  const decoder =
    new TextDecoder(
      "utf-8"
    );


  let buffer =
    "";

  let fullText =
    "";


  while (true) {

    const {
      done,
      value
    } =
      await reader.read();


    if (done) {
      break;
    }


    buffer +=
      decoder.decode(

        value,

        {
          stream:
            true
        }

      );


    const lines =
      buffer.split(
        /\r?\n/
      );


    buffer =
      lines.pop() ||
      "";


    for (
      const rawLine
      of lines
    ) {

      const line =
        rawLine.trim();


      if (
        !line.startsWith(
          "data:"
        )
      ) {

        continue;

      }


      const jsonText =
        line
          .slice(5)
          .trim();


      if (!jsonText) {
        continue;
      }


      if (
        jsonText ===
        "[DONE]"
      ) {

        continue;

      }


      let data;


      try {

        data =
          JSON.parse(
            jsonText
          );

      } catch {

        continue;

      }


      if (
        data.error
      ) {

        throw new Error(

          data.error.message ||
          "Error de Gemini."

        );

      }


      const candidates =
        data.candidates ||
        [];


      for (
        const candidate
        of candidates
      ) {

        const parts =
          candidate
            .content
            ?.parts ||
          [];


        for (
          const part
          of parts
        ) {

          if (
            typeof part.text !==
            "string"
          ) {

            continue;

          }


          if (!part.text) {
            continue;
          }


          fullText +=
            part.text;


          if (
            typeof onChunk ===
            "function"
          ) {

            onChunk(
              fullText
            );

          }

        }

      }

    }

  }


  if (
    !fullText.trim()
  ) {

    throw new Error(

      "Gemini terminó sin devolver texto."

    );

  }


  return fullText;

}


/* ============================================================
   OPENAI-COMPATIBLE STREAM
   ============================================================ */

async function readOpenAIStream(
  response,
  onChunk
) {

  if (!response.body) {

    throw new Error(

      "La API no devolvió un stream."

    );

  }


  const reader =
    response.body.getReader();


  const decoder =
    new TextDecoder(
      "utf-8"
    );


  let buffer =
    "";

  let fullText =
    "";


  while (true) {

    const {
      done,
      value
    } =
      await reader.read();


    if (done) {
      break;
    }


    buffer +=
      decoder.decode(

        value,

        {
          stream:
            true
        }

      );


    const lines =
      buffer.split(
        /\r?\n/
      );


    buffer =
      lines.pop() ||
      "";


    for (
      const line
      of lines
    ) {

      if (
        !line.startsWith(
          "data:"
        )
      ) {

        continue;

      }


      const jsonText =
        line
          .slice(5)
          .trim();


      if (
        !jsonText ||
        jsonText ===
          "[DONE]"
      ) {

        continue;

      }


      let data;


      try {

        data =
          JSON.parse(
            jsonText
          );

      } catch {

        continue;

      }


      if (
        data.error
      ) {

        throw new Error(

          data.error.message ||
          "Error del proveedor."

        );

      }


      for (
        const choice
        of data.choices ||
        []
      ) {

        const text =
          choice.delta
            ?.content ||
          "";


        if (
          typeof text !==
          "string"
        ) {

          continue;

        }


        if (!text) {
          continue;
        }


        fullText +=
          text;


        if (
          typeof onChunk ===
          "function"
        ) {

          onChunk(
            fullText
          );

        }

      }

    }

  }


  if (
    !fullText.trim()
  ) {

    throw new Error(

      "La API terminó sin devolver texto."

    );

  }


  return fullText;

}


/* ============================================================
   API SELECTOR
   ============================================================ */

function refreshApiSelector() {

  const select =
    document.getElementById(
      "ai-api"
    );


  if (!select) {
    return;
  }


  const apis =
    loadApis();


  select.innerHTML =
    "";


  if (!apis.length) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      "";


    option.textContent =
      "Sin APIs gratuitas";


    select.appendChild(
      option
    );


    return;

  }


  for (
    const api
    of apis
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      api.id;


    option.textContent =
      api.providerName;


    select.appendChild(
      option
    );

  }


  if (
    apis.some(
      api =>
        api.id ===
        currentApiId
    )
  ) {

    select.value =
      currentApiId;

  } else {

    currentApiId =
      apis[0].id;


    select.value =
      currentApiId;


    saveState();

  }

}


/* ============================================================
   MODEL SELECTOR
   ============================================================ */

function refreshModelSelector() {

  const select =
    document.getElementById(
      "ai-model"
    );


  if (!select) {
    return;
  }


  select.innerHTML =
    "";


  const api =
    getCurrentApi();


  if (!api) {
    return;
  }


  const models =
    (
      api.models ||
      []
    )
      .filter(
        model =>
          model.free ===
          true
      );


  if (!models.length) {

    const option =
      document.createElement(
        "option"
      );


    option.textContent =
      "Sin modelos gratuitos";


    select.appendChild(
      option
    );


    return;

  }


  for (
    const model
    of models
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      model.id;


    option.textContent =

      typeof model.dailyEstimate ===
        "number"

        ?

        `${model.name} · ~${model.dailyEstimate}/día`

        :

        `${model.name} · GRATIS`;


    option.title =
      model.note ||
      "";


    select.appendChild(
      option
    );

  }


  if (
    models.some(
      model =>
        model.id ===
        currentModelId
    )
  ) {

    select.value =
      currentModelId;

  } else {

    currentModelId =
      models[0].id;


    select.value =
      currentModelId;


    saveState();

  }

}


/* ============================================================
   CAPACIDADES DEL MODELO
   ============================================================ */

function updateModelCapability() {

  const quota =
    document.getElementById(
      "ai-quota"
    );


  if (!quota) {
    return;
  }


  const api =
    getCurrentApi();


  const model =
    getCurrentModel();


  if (!api || !model) {

    quota.innerHTML = `

      <span>
        No hay un modelo seleccionado.
      </span>

    `;


    updateImageButton();


    return;

  }


  const used =
    getUsage();


  let quotaText =
    "";


  if (
    typeof model.dailyEstimate ===
      "number"
  ) {

    const remaining =
      Math.max(

        0,

        model.dailyEstimate -
          used

      );


    quotaText = `

      <span>
        ~${model.dailyEstimate}/día
      </span>

      <span>
        Usados:
        <strong>
          ${used}
        </strong>
      </span>

      <span>
        Restantes:
        <strong>
          ${remaining}
        </strong>
      </span>

    `;

  } else {

    quotaText = `

      <span>
        Cuota:
        <strong>
          variable
        </strong>
      </span>

      <span>
        Usados:
        <strong>
          ${used}
        </strong>
      </span>

    `;

  }


  const supportsImage =
    model.supportsImage ===
    true;


  const imageStatus =

    supportsImage

      ? `

        <span
          class="model-capability yes"
        >
          Imagen: ✅ Soporta imágenes
        </span>

      `

      : `

        <span
          class="model-capability no"
        >
          Imagen: ❌ Solo texto
        </span>

      `;


  quota.innerHTML = `

    <span>
      IA:
      <strong>
        ${escapeHtml(
          api.providerName
        )}
      </strong>
    </span>


    <span>
      Modelo:
      <strong>
        ${escapeHtml(
          model.name
        )}
      </strong>
    </span>


    <span>
      GRATIS
    </span>


    ${quotaText}


    ${imageStatus}


    <span
      style="opacity:.55"
    >
      ${escapeHtml(
        model.note ||
        ""
      )}
    </span>

  `;


  updateImageButton();

}


function updateQuotaBar() {

  updateModelCapability();

}


/* ============================================================
   IMAGE BUTTON
   ============================================================ */

function updateImageButton() {

  const button =
    document.getElementById(
      "ai-img-btn"
    );


  if (!button) {
    return;
  }


  const model =
    getCurrentModel();


  const supported =

    model &&

    model.supportsImage ===
      true;


  button.disabled =
    !supported ||
    isStreaming;


  if (supported) {

    button.title =
      "Adjuntar imagen";


    button.textContent =
      "🖼";

  } else {

    button.title =
      "El modelo seleccionado no admite imágenes";


    button.textContent =
      "🚫";

  }

}


/* ============================================================
   MAIN UI
   ============================================================ */

function createUI() {

  if (
    document.getElementById(
      "ai-overlay"
    )
  ) {

    return;

  }


  injectStyles();

  loadLibs();


  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "ai-overlay";


  overlay.innerHTML = `

    <div id="ai-box">

      <div id="ai-head">

        <div id="ai-head-row">

          <div id="ai-title-wrap">

            <span
              id="ai-head-title"
            >
              ✦ ${PROJECT_NAME}
            </span>


            <button
              id="ai-github"
              type="button"
              title="GitHub"
              aria-label="GitHub"
            >

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >

                <path
                  fill="currentColor"
                  d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.85 10.91.57.1.78-.25.78-.55 0-.27-.01-.99-.01-1.94-3.19.69-3.86-1.54-3.86-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.74 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.52-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.39-5.25 5.68.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
                />

              </svg>

            </button>

          </div>


          <div id="ai-head-actions">

            <select
              id="ai-api"
              title="API"
            ></select>


            <select
              id="ai-model"
              title="Modelo"
            ></select>


            <button
              id="ai-api-btn"
              type="button"
            >
              🔑 APIs
            </button>


            <button
              id="ai-save"
              type="button"
              title="Guardar conversación"
            >
              💾 Guardar
            </button>


            <button
              id="ai-close"
              type="button"
            >
              ✕
            </button>

          </div>

        </div>


        <div
          id="ai-quota"
        >
        </div>

      </div>


      <div
        id="ai-settings"
      >
      </div>


      <div
        id="ai-msgs"
      >
      </div>


      <div
        id="ai-input-wrap"
      >

        <div
          id="ai-preview"
        >
        </div>


        <div
          id="ai-controls"
        >

          <button
            id="ai-img-btn"
            type="button"
            title="Adjuntar imagen"
          >
            🖼
          </button>


          <textarea
            id="ai-input"
            placeholder="Escribí..."
            rows="1"
          ></textarea>


          <button
            id="ai-send"
            type="button"
          >
            Enviar
          </button>

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    overlay
  );


  /*
   * GitHub.
   */

  overlay.querySelector(
    "#ai-github"
  ).onclick =
    () => {

      window.open(
        GITHUB_URL,
        "_blank",
        "noopener,noreferrer"
      );

    };


  /*
   * APIs.
   */

  overlay.querySelector(
    "#ai-api-btn"
  ).onclick =
    () => {

      openApiSettings();

    };


  /*
   * GUARDAR.
   * Nunca borra el chat.
   */

  overlay.querySelector(
    "#ai-save"
  ).onclick =
    () => {

      exportChat();

    };


  /*
   * CERRAR.
   */

  overlay.querySelector(
    "#ai-close"
  ).onclick =
    () => {

      closeChat();

    };


  /*
   * Mensaje inicial.
   */

  if (
    uiMessages.length ===
    0
  ) {

    uiMessages.push({

      who:
        "bot",

      content:

        `Bienvenido a ${PROJECT_NAME}. ` +

        "Agregá una API gratuita desde 🔑 APIs.",

      isHtml:
        false

    });


    saveState();

  }


  const apiSelect =
    overlay.querySelector(
      "#ai-api"
    );


  const modelSelect =
    overlay.querySelector(
      "#ai-model"
    );


  const input =
    overlay.querySelector(
      "#ai-input"
    );


  const sendButton =
    overlay.querySelector(
      "#ai-send"
    );


  /*
   * Cambiar API.
   */

  apiSelect.onchange =
    () => {

      currentApiId =
        apiSelect.value;


      currentModelId =
        null;


      saveState();


      refreshOpenUI();

    };


  /*
   * Cambiar modelo.
   */

  modelSelect.onchange =
    () => {

      currentModelId =
        modelSelect.value;


      saveState();


      refreshOpenUI();

    };


  /*
   * Click fuera para cerrar.
   */

  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target !==
        overlay
      ) {

        return;

      }


      if (
        Date.now() <
        ignoreOverlayCloseUntil
      ) {

        return;

      }


      closeChat();

    }
  );


  /*
   * Input de imágenes.
   */

  const fileInput =
    document.createElement(
      "input"
    );


  fileInput.type =
    "file";


  fileInput.multiple =
    true;


  fileInput.accept = [

    "image/png",

    "image/jpeg",

    "image/webp",

    "image/gif",

    "image/heic",

    "image/heif"

  ].join(",");


  fileInput.style.display =
    "none";


  overlay.appendChild(
    fileInput
  );


  const imageButton =
    overlay.querySelector(
      "#ai-img-btn"
    );


  imageButton.onclick =
    () => {

      const model =
        getCurrentModel();


      if (
        !model ||
        model.supportsImage !==
          true
      ) {

        alert(

          "El modelo seleccionado no admite imágenes.\n\n" +

          "Elegí uno marcado con:\n" +

          "Imagen: ✅ Soporta imágenes"

        );


        return;

      }


      fileInput.click();

    };


  fileInput.onchange =
    async () => {

      for (
        const file
        of fileInput.files
      ) {

        if (
          currentImages.length >=
          4
        ) {

          alert(
            "Máximo 4 imágenes."
          );


          break;

        }


        try {

          const image =
            await createImageAttachment(
              file
            );


          currentImages.push(
            image
          );


        } catch (
          error
        ) {

          alert(
            error.message
          );

        }

      }


      fileInput.value =
        "";


      renderImagePreview();

    };


  /*
   * Pegar imágenes.
   */

  input.addEventListener(
    "paste",
    async event => {

      const model =
        getCurrentModel();


      if (
        !model ||
        model.supportsImage !==
          true
      ) {

        return;

      }


      const items =
        event.clipboardData
          ?.items;


      if (!items) {
        return;
      }


      for (
        const item
        of items
      ) {

        if (
          !item.type.startsWith(
            "image/"
          )
        ) {

          continue;

        }


        const file =
          item.getAsFile();


        if (!file) {
          continue;
        }


        event.preventDefault();


        if (
          currentImages.length >=
          4
        ) {

          alert(
            "Máximo 4 imágenes."
          );


          return;

        }


        try {

          const image =
            await createImageAttachment(
              file
            );


          currentImages.push(
            image
          );


          renderImagePreview();

        } catch (
          error
        ) {

          alert(
            error.message
          );

        }

      }

    }
  );


  /*
   * Drag & Drop.
   */

  const box =
    overlay.querySelector(
      "#ai-box"
    );


  box.addEventListener(
    "dragover",
    event => {

      event.preventDefault();


      box.style.outline =
        "2px solid #3B82F6";

    }
  );


  box.addEventListener(
    "dragleave",
    () => {

      box.style.outline =
        "none";

    }
  );


  box.addEventListener(
    "drop",
    async event => {

      event.preventDefault();


      box.style.outline =
        "none";


      const model =
        getCurrentModel();


      if (
        !model ||
        model.supportsImage !==
          true
      ) {

        return;

      }


      for (
        const file
        of event.dataTransfer.files
      ) {

        if (
          currentImages.length >=
          4
        ) {

          break;

        }


        try {

          const image =
            await createImageAttachment(
              file
            );


          currentImages.push(
            image
          );


        } catch {}

      }


      renderImagePreview();

    }
  );


  /*
   * Enviar.
   */

  sendButton.onclick =
    sendMessage;


  input.addEventListener(
    "keydown",
    event => {

      if (

        event.key ===
          "Enter"

        &&

        !event.shiftKey

      ) {

        event.preventDefault();


        sendButton.click();

      }

    }
  );


  input.addEventListener(
    "input",
    () => {

      input.style.height =
        "auto";


      input.style.height =
        Math.min(
          input.scrollHeight,
          140
        ) +
        "px";

    }
  );


  refreshOpenUI();

}


/* ============================================================
   REFRESH UI
   ============================================================ */

function refreshOpenUI() {

  ensureFab();


  if (!isOpen) {
    return;
  }


  refreshApiSelector();

  refreshModelSelector();

  updateModelCapability();

  refreshMessages();

  renderImagePreview();

}


/* ============================================================
   MESSAGES
   ============================================================ */

function refreshMessages() {

  const container =
    document.getElementById(
      "ai-msgs"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  for (
    const message
    of uiMessages
  ) {

    const div =
      document.createElement(
        "div"
      );


    div.className =
      "msg " +
      message.who;


    if (
      message.isHtml
    ) {

      div.innerHTML =
        message.content;

    } else {

      div.innerHTML =
        renderMarkdown(
          message.content
        );

    }


    container.appendChild(
      div
    );

  }


  if (isStreaming) {

    const div =
      document.createElement(
        "div"
      );


    div.className =
      "msg bot streaming-cursor";


    if (streamError) {

      div.textContent =
        "❌ " +
        streamError;

    } else if (
      streamText
    ) {

      div.innerHTML =
        renderMarkdown(
          streamText
        );

    } else {

      div.textContent =
        "Pensando...";

    }


    container.appendChild(
      div
    );

  }


  container.scrollTop =
    container.scrollHeight;

}


/* ============================================================
   IMAGE PREVIEW
   ============================================================ */

function renderImagePreview() {

  const preview =
    document.getElementById(
      "ai-preview"
    );


  if (!preview) {
    return;
  }


  preview.innerHTML =
    "";


  currentImages.forEach(
    (
      image,
      index
    ) => {

      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.style.cssText = `

        position:relative;

        width:82px;

        height:66px;

      `;


      const img =
        document.createElement(
          "img"
        );


      img.src =
        `data:${image.mimeType};base64,${image.data}`;


      img.alt =
        image.name;


      img.title =
        image.name;


      img.style.cssText = `

        width:82px;

        height:66px;

        object-fit:cover;

        border-radius:8px;

        border:
          1px solid #3B82F6;

        background:#020617;

        display:block;

      `;


      wrapper.appendChild(
        img
      );


      const remove =
        document.createElement(
          "button"
        );


      remove.type =
        "button";


      remove.textContent =
        "×";


      remove.title =
        "Quitar imagen";


      remove.style.cssText = `

        position:absolute;

        top:-7px;

        right:-7px;

        width:20px;

        height:20px;

        padding:0;

        border:
          1px solid #991B1B;

        border-radius:50%;

        background:#DC2626;

        color:#FFFFFF;

        cursor:pointer;

        font-weight:900;

        line-height:16px;

      `;


      remove.onclick =
        () => {

          currentImages.splice(
            index,
            1
          );


          renderImagePreview();

        };


      wrapper.appendChild(
        remove
      );


      preview.appendChild(
        wrapper
      );

    }
  );

}


/* ============================================================
   OPEN / CLOSE CHAT
   ============================================================ */

function openChat() {

  ignoreOverlayCloseUntil =
    Date.now() + 600;


  /*
   * Crear interfaz antes de cambiar el estado.
   */

  injectStyles();


  createUI();


  isOpen =
    true;


  ensureFab();


  refreshOpenUI();

}


function closeChat() {

  document
    .getElementById(
      "ai-overlay"
    )
    ?.remove();


  isOpen =
    false;


  currentImages =
    [];


  saveState();


  ensureFab();

}


/* ============================================================
   FAB - SISTEMA ROBUSTO
   ============================================================ */

/*
 * Determina si el evento pertenece al FAB.
 */

function eventHitsFab(
  event
) {

  if (!event) {
    return false;
  }


  if (
    event.target &&
    event.target.id ===
      FAB_ID
  ) {

    return true;

  }


  if (
    event.target &&
    event.target.closest
  ) {

    try {

      if (
        event.target.closest(
          "#" +
          FAB_ID
        )
      ) {

        return true;

      }

    } catch {}

  }


  if (
    typeof event.composedPath ===
    "function"
  ) {

    const path =
      event.composedPath();


    if (
      path.some(
        node =>
          node &&
          node.id ===
            FAB_ID
      )
    ) {

      return true;

    }

  }


  return false;

}


/*
 * Un único punto que alterna la interfaz.
 *
 * Protección contra:
 * - pointerdown + click
 * - doble click accidental
 * - listeners de Pengu
 */

function toggleFabSafely(
  event
) {

  const now =
    Date.now();


  /*
   * Ignorar el segundo evento generado
   * por la misma interacción física.
   */

  if (
    now -
      lastFabToggleAt <
      350
  ) {

    return;

  }


  lastFabToggleAt =
    now;


  if (event) {

    try {

      event.preventDefault();

    } catch {}


    try {

      event.stopPropagation();

    } catch {}


    try {

      if (
        event.stopImmediatePropagation
      ) {

        event.stopImmediatePropagation();

      }

    } catch {}

  }


  ignoreOverlayCloseUntil =
    Date.now() + 600;


  try {

    if (isOpen) {

      closeChat();

    } else {

      openChat();

    }

  } catch (
    error
  ) {

    console.error(

      `[${PROJECT_NAME}] Error abriendo/cerrando FAB:`,

      error

    );

  }

}


/*
 * Listener global en CAPTURE.
 *
 * Esto permite recibir el evento incluso cuando otro
 * listener del cliente intenta interceptarlo.
 */

function bindFabEvents() {

  if (
    fabEventsBound
  ) {

    return;

  }


  fabEventsBound =
    true;


  document.addEventListener(

    "pointerdown",

    event => {

      if (
        !eventHitsFab(
          event
        )
      ) {

        return;

      }


      toggleFabSafely(
        event
      );

    },

    true

  );


  document.addEventListener(

    "click",

    event => {

      if (
        !eventHitsFab(
          event
        )
      ) {

        return;

      }


      /*
       * pointerdown normalmente ya abrió/cerró
       * la interfaz. La protección de 350 ms
       * evita que este click vuelva a alternarla.
       */

      toggleFabSafely(
        event
      );

    },

    true

  );


}


/*
 * Compatible con versiones anteriores.
 */

function bindFabGlobalClick() {

  bindFabEvents();

}


/* ============================================================
   CREAR FAB
   ============================================================ */

function ensureFab() {

  injectStyles();

  bindFabEvents();


  let fab =
    document.getElementById(
      FAB_ID
    );


  /*
   * El DOM de Pengu puede reconstruirse.
   * Si desaparece, lo volvemos a crear.
   */

  if (
    !fab
  ) {

    try {

      document
        .querySelectorAll(
          "#" +
          FAB_ID
        )
        .forEach(
          node => {

            try {

              node.remove();

            } catch {}

          }
        );

    } catch {}


    fab =
      document.createElement(
        "button"
      );


    fab.id =
      FAB_ID;


    fab.type =
      "button";


    fab.title =
      PROJECT_NAME;


    fab.setAttribute(
      "aria-label",
      `Abrir ${PROJECT_NAME}`
    );


    /*
     * Evitar que el botón sea tratado
     * como parte de un formulario.
     */

    fab.setAttribute(
      "tabindex",
      "0"
    );


    fab.innerHTML = `

      <span
        style="
          font-size:22px;
          line-height:1;
          pointer-events:none;
          display:block;
        "
      >
        ✦
      </span>

    `;


    fab.style.cssText = `

      position:fixed;

      left:16px;

      bottom:16px;

      width:52px;

      height:52px;

      border-radius:50%;

      border:
        2px solid #3B82F6;

      background:
        #050B18;

      color:
        #60A5FA;

      box-shadow:
        0 8px 28px
        rgba(0,0,0,.7);

      z-index:
        2147483647;

      cursor:pointer;

      display:flex;

      align-items:center;

      justify-content:center;

      padding:0;

      margin:0;

      opacity:1;

      pointer-events:auto;

      user-select:none;

      -webkit-user-select:none;

      outline:none;

      overflow:visible;

      font-size:22px;

      font-weight:900;

      touch-action:manipulation;

    `;


    /*
     * Fallback directo además del listener global.
     */

    fab.addEventListener(
      "pointerdown",
      event => {

        /*
         * El listener global ya debería recibirlo.
         * El guard de tiempo evita doble ejecución.
         */

        if (
          eventHitsFab(
            event
          )
        ) {

          toggleFabSafely(
            event
          );

        }

      },
      false
    );


    fab.addEventListener(
      "click",
      event => {

        if (
          eventHitsFab(
            event
          )
        ) {

          toggleFabSafely(
            event
          );

        }

      },
      false
    );


    const host =
      document.body ||
      document.documentElement;


    host.appendChild(
      fab
    );

  }


  /*
   * Refrescar aspecto.
   */

  if (isOpen) {

    fab.style.background =
      "#2563EB";


    fab.style.color =
      "#FFFFFF";

  } else {

    fab.style.background =
      "#050B18";


    fab.style.color =
      "#60A5FA";

  }


  if (isStreaming) {

    fab.style.boxShadow =

      "0 0 0 3px rgba(59,130,246,.55)," +

      "0 8px 28px rgba(0,0,0,.7)";

  } else {

    fab.style.boxShadow =
      "0 8px 28px rgba(0,0,0,.7)";

  }

}


/* ============================================================
   FAB WATCHDOG
   ============================================================ */

function startFabWatchdog() {

  if (fabTimer) {
    return;
  }


  fabTimer =
    setInterval(
      () => {

        try {

          ensureFab();

        } catch (
          error
        ) {

          console.error(

            `[${PROJECT_NAME}] FAB watchdog:`,

            error

          );

        }

      },
      1000
    );

}


/* ============================================================
   COMMAND BAR / CTRL + K
   ============================================================ */

function registerCommandBar() {

  if (
    commandBarRegistered
  ) {

    return;

  }


  if (
    typeof CommandBar ===
      "undefined"
  ) {

    setTimeout(
      registerCommandBar,
      1000
    );


    return;

  }


  try {

    CommandBar.addAction({

      id:
        "ai-knmollpy/open-v132",

      name:
        "Abrir IA knmollpy",

      legend:
        "✦ abajo a la izquierda",

      group:
        "AI Tools",

      tags: [

        "ia",

        "ai",

        "chat",

        "knmollpy",

        "gemini",

        "groq",

        "openrouter",

        "free",

        "gratis"

      ],

      perform:
        () => {

          ignoreOverlayCloseUntil =
            Date.now() + 600;


          if (isOpen) {

            closeChat();

          } else {

            openChat();

          }

        }

    });


    commandBarRegistered =
      true;


    console.log(

      `[${PROJECT_NAME}] CommandBar registrado correctamente.`

    );


  } catch (
    error
  ) {

    commandBarRegistered =
      false;


    console.error(

      `[${PROJECT_NAME}] Error CommandBar:`,

      error

    );


    setTimeout(
      registerCommandBar,
      1500
    );

  }

}


/* ============================================================
   CSS
   ============================================================ */

function injectStyles() {

  if (
    document.getElementById(
      "ai-knmollpy-styles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "ai-knmollpy-styles";


  style.textContent = `

    #ai-overlay {

      position:fixed;

      inset:0;

      background:
        rgba(1,5,15,.90);

      backdrop-filter:
        blur(13px);

      z-index:
        2147483645;

      display:flex;

      justify-content:center;

      align-items:flex-start;

      padding-top:4vh;

      font-family:
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;

    }


    #ai-box {

      width:920px;

      max-width:96vw;

      height:89vh;

      background:#050B18;

      border:
        1px solid #2563EB;

      border-radius:16px;

      display:flex;

      flex-direction:column;

      overflow:hidden;

      box-shadow:
        0 30px 100px
        rgba(0,0,0,.95);

    }


    #ai-head {

      padding:12px 14px;

      background:
        linear-gradient(
          180deg,
          #0B1730,
          #050B18
        );

      border-bottom:
        1px solid #17345F;

      display:flex;

      flex-direction:column;

      gap:8px;

    }


    #ai-head-row {

      display:flex;

      justify-content:
        space-between;

      align-items:center;

      gap:12px;

      flex-wrap:wrap;

    }


    #ai-title-wrap {

      display:flex;

      align-items:center;

      gap:8px;

    }


    #ai-head-title {

      color:#DBEAFE;

      font-weight:900;

      font-size:14px;

      letter-spacing:.25px;

      white-space:nowrap;

    }


    #ai-github {

      width:29px;

      height:29px;

      display:flex;

      align-items:center;

      justify-content:center;

      padding:5px;

      background:#0B1730;

      color:#CBD5E1;

      border:
        1px solid #1D4ED8;

      border-radius:7px;

      cursor:pointer;

      transition:.15s ease;

    }


    #ai-github svg {

      width:16px;

      height:16px;

      display:block;

    }


    #ai-github:hover {

      background:#2563EB;

      color:#FFFFFF;

      border-color:#60A5FA;

      transform:
        translateY(-1px);

    }


    #ai-head-actions {

      display:flex;

      gap:6px;

      align-items:center;

      flex-wrap:wrap;

    }


    #ai-head-actions button,
    #ai-api,
    #ai-model {

      background:#0D1B33;

      color:#93C5FD;

      border:
        1px solid #1D4ED8;

      border-radius:7px;

      padding:6px 9px;

      font-size:11px;

      cursor:pointer;

      outline:none;

      max-width:300px;

    }


    #ai-head-actions button:hover {

      background:#2563EB;

      color:#FFFFFF;

      border-color:#60A5FA;

    }


    #ai-head-actions button:disabled,
    #ai-img-btn:disabled {

      opacity:.42;

      cursor:not-allowed;

    }


    #ai-quota {

      display:flex;

      flex-wrap:wrap;

      gap:9px;

      color:#8FAED0;

      font-size:10px;

      line-height:1.5;

      align-items:center;

    }


    #ai-quota strong {

      color:#60A5FA;

    }


    .model-capability {

      padding:
        2px 6px;

      border-radius:
        5px;

      font-weight:
        800;

    }


    .model-capability.yes {

      color:#86EFAC;

      background:
        rgba(34,197,94,.10);

      border:
        1px solid
        rgba(34,197,94,.25);

    }


    .model-capability.no {

      color:#FCA5A5;

      background:
        rgba(239,68,68,.10);

      border:
        1px solid
        rgba(239,68,68,.25);

    }


    #ai-msgs {

      flex:1;

      overflow-y:auto;

      padding:16px;

      display:flex;

      flex-direction:column;

      gap:12px;

      background:
        radial-gradient(
          circle at top,
          rgba(37,99,235,.08),
          transparent 38%
        );

      user-select:text;

    }


    .msg {

      max-width:92%;

      padding:11px 13px;

      border-radius:10px;

      font-size:13.5px;

      line-height:1.55;

      word-break:break-word;

    }


    .msg.user {

      align-self:flex-end;

      background:#10264A;

      color:#DBEAFE;

      border:
        1px solid #1D4ED8;

    }


    .msg.bot {

      align-self:flex-start;

      background:#0B1426;

      color:#E5E7EB;

      border:
        1px solid #16325A;

    }


    .msg pre {

      overflow-x:auto;

      background:#020617;

      border:
        1px solid #1E3A5F;

      padding:10px;

      border-radius:7px;

    }


    .msg code {

      font-family:
        Consolas,
        Monaco,
        monospace;

    }


    .msg img {

      max-width:100%;

      height:auto;

      border-radius:8px;

    }


    #ai-settings {

      display:none;

      padding:13px 14px;

      background:#071226;

      border-bottom:
        1px solid #17345F;

      max-height:45vh;

      overflow:auto;

    }


    #ai-settings.open {

      display:block;

    }


    #ai-input-wrap {

      padding:12px 14px;

      background:#07101F;

      border-top:
        1px solid #17345F;

      display:flex;

      flex-direction:column;

      gap:8px;

    }


    #ai-preview {

      display:flex;

      flex-wrap:wrap;

      gap:8px;

    }


    #ai-controls {

      display:flex;

      gap:8px;

      align-items:flex-end;

    }


    #ai-input {

      flex:1;

      background:#0A162B;

      color:#EFF6FF;

      border:
        1px solid #214776;

      border-radius:9px;

      padding:11px 12px;

      outline:none;

      resize:none;

      min-height:23px;

      max-height:140px;

      font-family:inherit;

      font-size:14px;

    }


    #ai-input:focus {

      border-color:#3B82F6;

      box-shadow:
        0 0 0 2px
        rgba(59,130,246,.14);

    }


    #ai-send,
    #ai-img-btn {

      background:#2563EB;

      color:#FFFFFF;

      border:
        1px solid #3B82F6;

      border-radius:9px;

      padding:11px 15px;

      cursor:pointer;

      font-weight:800;

    }


    #ai-img-btn {

      background:#0D1B33;

      color:#60A5FA;

    }


    #ai-send:hover,
    #ai-img-btn:hover {

      background:#1D4ED8;

      color:#FFFFFF;

    }


    .streaming-cursor::after {

      content:"▋";

      animation:
        blink 1s infinite;

      margin-left:2px;

      color:#60A5FA;

    }


    @keyframes blink {

      50% {
        opacity:0;
      }

    }


    ::-webkit-scrollbar {

      width:7px;

    }


    ::-webkit-scrollbar-track {

      background:#050B18;

    }


    ::-webkit-scrollbar-thumb {

      background:#1D4ED8;

      border-radius:5px;

    }


    @media(max-width:700px) {

      #ai-box {

        max-width:98vw;

        height:94vh;

      }


      #ai-head-actions {

        width:100%;

      }


      #ai-api,
      #ai-model {

        max-width:100%;

      }

    }

  `;


  (
    document.head ||
    document.documentElement
  )
    .appendChild(
      style
    );

}


/* ============================================================
   LOAD
   ============================================================ */

export function load() {

  try {

    loadState();

  } catch (
    error
  ) {

    console.error(

      `[${PROJECT_NAME}] loadState error:`,

      error

    );

  }


  injectStyles();


  /*
   * Registrar primero los eventos globales.
   */

  bindFabEvents();


  const boot =
    () => {

      if (
        !document.body
      ) {

        setTimeout(
          boot,
          200
        );


        return;

      }


      try {

        ensureFab();

        startFabWatchdog();

      } catch (
        error
      ) {

        console.error(

          `[${PROJECT_NAME}] Error creando FAB:`,

          error

        );

      }


      registerCommandBar();

    };


  boot();


  /*
   * ESC.
   */

  window.addEventListener(
    "keydown",
    event => {

      if (

        event.key ===
          "Escape"

        &&

        isOpen

      ) {

        closeChat();

      }

    }
  );


  console.log(

    `[${PROJECT_NAME}] v13.2.0 cargado correctamente.`

  );

}
