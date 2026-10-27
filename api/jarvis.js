import crypto from "node:crypto";

const MAX_DIRECTIVE_LENGTH = 4096;

function classifyDirective(directive) {
  const normalized = directive.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(despliega|publica|ship|deploy|produccion)\b/.test(normalized)) return "DEPLOYMENT_REQUEST_NOT_EXECUTED";
  if (/\b(audita|auditoria|fleet|flota|repositorio)\b/.test(normalized)) return "AUDIT_REQUEST_NOT_EXECUTED";
  if (/\b(seguridad|sast|secretos|vulnerabilidad)\b/.test(normalized)) return "SECURITY_REQUEST_NOT_EXECUTED";
  if (/\b(estado|status|salud|health)\b/.test(normalized)) return "STATUS_REQUEST_NOT_PROBED";
  return "UNCLASSIFIED_DIRECTIVE";
}

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ status: "METHOD_NOT_ALLOWED" });
  }

  const directive = req.query?.directive ?? "";
  if (typeof directive !== "string" || directive.length > MAX_DIRECTIVE_LENGTH) {
    return res.status(400).json({ status: "INVALID_DIRECTIVE", maxLength: MAX_DIRECTIVE_LENGTH });
  }

  const intent = classifyDirective(directive);
  const directiveSha256 = crypto.createHash("sha256").update(directive, "utf8").digest("hex");
  const responseText = intent === "DEPLOYMENT_REQUEST_NOT_EXECUTED"
    ? "La solicitud fue clasificada como despliegue. No se ejecutó ninguna acción; revisa el proyecto y autoriza el flujo de publicación por separado."
    : intent === "STATUS_REQUEST_NOT_PROBED"
      ? "La solicitud fue clasificada como consulta de estado. Este endpoint no sondea procesos, subsistemas ni producción."
      : "Directiva recibida y clasificada localmente por reglas de palabras clave. No se llamó a un modelo de IA.";

  return res.status(200).json({
    status: "INTENT_CLASSIFIED",
    directiveReceived: directive,
    intent,
    responseText,
    execution: {
      externalModelCalled: false,
      repositoriesRead: false,
      commandsRun: false,
      testsRun: false,
      deploymentRun: false,
      consensusRun: false
    },
    directiveSha256: `sha256:${directiveSha256}`,
    note: "The digest fingerprints the directive text only. It is not a signature, Merkle receipt, execution result, or health check."
  });
}
