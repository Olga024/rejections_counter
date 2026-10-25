console.log("✅ Консольное приложение успешно запущено!");
console.log("📡 Подготовка к запросу к указанному вами эндпоинту...");

const ENDPOINT_URL = "https://jsonplaceholder.typicode.com/posts/1";

async function callEndpoint() {
  try {
    const response = await fetch(ENDPOINT_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ошибка! Статус: ${response.status}`);
    }

    const data = await response.json();
    console.log("📦 Данные, возвращённые эндпоинтом:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Ошибка запроса:", error);
    process.exit(1);
  }
}

callEndpoint();