export class BenedictusContracts {
  validateCommand(input) {
    const prompt = String(input?.prompt ?? "").trim();
    if (prompt.length < 4) {
      return { ok: false, reason: "La commande est trop courte." };
    }
    if (prompt.length > 1200) {
      return { ok: false, reason: "La commande depasse la limite de 1200 caracteres." };
    }
    return { ok: true, prompt };
  }

  validateBuildPatch(input) {
    if (!input?.type || !input?.position) {
      return { ok: false, reason: "Patch BuildRealtime invalide." };
    }
    return { ok: true, patch: input };
  }
}
