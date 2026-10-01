import { test } from "node:test";
import assert from "node:assert/strict";
import { duracaoCurta, MIN_SEM_SINAL, situacaoWhatsApp, type StatusWhatsApp } from "../lib/statusWhatsApp";

const AGORA = Date.parse("2026-10-01T14:00:00Z");
const status = (whatsapp: string, minutosAtras: number, detalhe: string | null = null): StatusWhatsApp => ({
  whatsapp,
  detalhe,
  atualizado_em: new Date(AGORA - minutosAtras * 60_000).toISOString(),
  segundos: minutosAtras * 60,
});

test("conectado e sinal recente → verde", () => {
  const r = situacaoWhatsApp(status("conectado", 1), AGORA);
  assert.equal(r.nivel, "ok");
  assert.equal(r.titulo, "WhatsApp conectado");
  assert.equal(r.minutos, 1);
});

test("sem sinal do computador há mais de 6 min → vermelho, mesmo que o último estado fosse 'conectado'", () => {
  const r = situacaoWhatsApp(status("conectado", MIN_SEM_SINAL), AGORA);
  assert.equal(r.nivel, "erro");
  assert.equal(r.titulo, "Sem sinal do computador");
  assert.match(r.texto, /Docker/);
  // 5 min ainda é normal (o n8n avisa a cada 2)
  assert.equal(situacaoWhatsApp(status("conectado", MIN_SEM_SINAL - 1), AGORA).nivel, "ok");
});

test("desconectado → vermelho com o caminho do QR code", () => {
  const r = situacaoWhatsApp(status("desconectado", 2), AGORA);
  assert.equal(r.nivel, "erro");
  assert.match(r.texto, /QR code/);
});

test("sem instância → amarelo (ainda não conectou)", () => {
  assert.equal(situacaoWhatsApp(status("sem_instancia", 0), AGORA).nivel, "atencao");
});

test("Evolution fora do ar → vermelho", () => {
  const r = situacaoWhatsApp(status("evolution_fora", 3), AGORA);
  assert.equal(r.nivel, "erro");
  assert.match(r.texto, /Docker/);
});

test("sem dados, data inválida ou estado desconhecido → amarelo, sem quebrar", () => {
  assert.equal(situacaoWhatsApp(null, AGORA).nivel, "atencao");
  assert.equal(situacaoWhatsApp(undefined, AGORA).minutos, null);
  assert.equal(situacaoWhatsApp({ whatsapp: "conectado", detalhe: null, atualizado_em: "lixo", segundos: 0 }, AGORA).nivel, "atencao");
  assert.equal(situacaoWhatsApp(status("qualquer-coisa", 1), AGORA).nivel, "atencao");
});

test("relógio do computador um pouco adiantado não gera minutos negativos", () => {
  assert.equal(situacaoWhatsApp(status("conectado", -3), AGORA).minutos, 0);
});

test("duração em português curto", () => {
  assert.equal(duracaoCurta(0), "menos de 1 min");
  assert.equal(duracaoCurta(45), "45 min");
  assert.equal(duracaoCurta(125), "2 h");
  assert.equal(duracaoCurta(60 * 72), "3 dias");
});
