import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Servico {
  id: string;
  descricao: string;
  codigo?: string;
  horas: number;
  precoHora: number;
}

interface Peca {
  id: string;
  descricao: string;
  codigo?: string;
  quantidade: number;
  unidade?: string;
  precoUnitario: number;
}

interface DadosOrcamento {
  // Empresa
  logoBase64?: string;
  nomeEmpresa?: string;
  responsavel?: string;
  telefone?: string;
  endereco?: string;
  cnpj?: string;

  // OS
  numeroOS?: string;
  dataEntrada?: string;
  horaInicio?: string;
  dataPrevista?: string;
  dataConclusao?: string;
  horaTermino?: string;

  // Cliente
  cliente: string;
  clienteCnpj?: string;
  clienteEndereco?: string;
  clienteBairro?: string;
  clienteCidade?: string;

  // Equipamento
  equipamento: string;
  numeroSerie?: string;

  // Problema / Obs
  problema: string;
  obsRecebimento?: string;
  obsServico?: string;
  infoTecnico?: string;

  // Itens
  servicos: Servico[];
  pecas: Peca[];

  // Totais
  totalServicos: number;
  totalPecas: number;
  totalGeral: number;
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#222",
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    backgroundColor: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  logo: { width: 90, height: 60, objectFit: "contain" },
  logoPlaceholder: {
    width: 90,
    height: 60,
    backgroundColor: "#1a3a6b",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  headerRight: { alignItems: "flex-end" },
  headerName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a3a6b" },
  headerInfo: { fontSize: 7.5, color: "#444", marginTop: 2 },

  // Título OS
  osTitle: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    color: "#1a3a6b",
  },

  // Seção genérica
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1a3a6b",
    marginBottom: 3,
    marginTop: 8,
    textTransform: "uppercase",
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a3a6b",
    paddingBottom: 2,
  },

  // Bloco cliente + metadados OS
  clienteBlock: { flexDirection: "row", gap: 6, marginBottom: 4 },
  clienteBox: {
    flex: 1,
    border: "0.5pt solid #aaa",
    padding: 5,
    borderRadius: 2,
  },
  clienteNome: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  clienteDetalhe: { fontSize: 7.5, color: "#444", marginTop: 1 },

  // Grid OS meta
  osMeta: { width: 160 },
  osMetaRow: { flexDirection: "row", marginBottom: 2 },
  osMetaCell: {
    flex: 1,
    border: "0.5pt solid #aaa",
    padding: 3,
    borderRadius: 2,
  },
  osMetaLabel: { fontSize: 6.5, color: "#666" },
  osMetaValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },

  // Campo único (equipamento, problema, obs)
  fieldBox: {
    border: "0.5pt solid #aaa",
    padding: 5,
    borderRadius: 2,
    minHeight: 20,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 6.5, color: "#888", marginBottom: 2 },
  fieldValue: { fontSize: 8 },

  // Tabela
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a3a6b",
    padding: 4,
    borderRadius: 2,
    marginBottom: 1,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRowAlt: { backgroundColor: "#f5f7fa" },

  // Colunas serviços
  colDescS: { flex: 3 },
  colCodS: { width: 55 },
  colHorasS: { width: 40, textAlign: "right" },
  colPrecoS: { width: 55, textAlign: "right" },
  colTotalS: { width: 60, textAlign: "right" },

  // Colunas peças
  colDescP: { flex: 3 },
  colCodP: { width: 55 },
  colQtdP: { width: 40, textAlign: "right" },
  colUnP: { width: 28, textAlign: "center" },
  colPrecoP: { width: 55, textAlign: "right" },
  colTotalP: { width: 60, textAlign: "right" },

  // Totais finais
  totalsRow: {
    flexDirection: "row",
    marginTop: 8,
    border: "0.5pt solid #1a3a6b",
    borderRadius: 2,
    overflow: "hidden",
  },
  totalsCell: {
    flex: 1,
    padding: 6,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#1a3a6b",
  },
  totalsCellLast: {
    flex: 2,
    padding: 6,
    alignItems: "center",
    backgroundColor: "#1a3a6b",
  },
  totalsLabel: { fontSize: 7, color: "#555", marginBottom: 2 },
  totalsValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalsLabelWhite: { fontSize: 7, color: "#ccd", marginBottom: 2 },
  totalsValueWhite: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },

  // Assinatura
  signatureArea: { flexDirection: "row", marginTop: 24, gap: 20 },
  signatureLine: {
    flex: 1,
    borderTopWidth: 0.5,
    borderTopColor: "#555",
    paddingTop: 4,
  },
  signatureLabel: { fontSize: 7, color: "#666", textAlign: "center" },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    textAlign: "center",
    fontSize: 6.5,
    color: "#aaa",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 4,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Componente ──────────────────────────────────────────────────────────────

export function OrcamentoPDF({ dados }: { dados: DadosOrcamento }) {
  const {
    logoBase64,
    nomeEmpresa = "TS Projetos",
    responsavel = "",
    telefone = "",
    endereco = "",
    cnpj = "",
    numeroOS = "—",
    dataEntrada = "",
    horaInicio = "",
    dataPrevista = "",
    dataConclusao = "",
    horaTermino = "",
    cliente,
    clienteCnpj = "",
    clienteEndereco = "",
    clienteBairro = "",
    clienteCidade = "",
    equipamento,
    numeroSerie = "",
    problema,
    obsRecebimento = "",
    obsServico = "",
    infoTecnico = "",
    servicos,
    pecas,
    totalServicos,
    totalPecas,
    totalGeral,
  } = dados;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.header}>
          {logoBase64 ? (
            <Image style={s.logo} src={logoBase64} />
          ) : (
            <View style={s.logoPlaceholder}>
              <Text style={s.logoPlaceholderText}>TS</Text>
            </View>
          )}
          <View style={s.headerRight}>
            <Text style={s.headerName}>{nomeEmpresa}</Text>
            {responsavel ? (
              <Text style={s.headerInfo}>{responsavel}</Text>
            ) : null}
            {telefone ? (
              <Text style={s.headerInfo}>Fone: {telefone}</Text>
            ) : null}
            {endereco ? <Text style={s.headerInfo}>{endereco}</Text> : null}
            {cnpj ? <Text style={s.headerInfo}>CNPJ: {cnpj}</Text> : null}
          </View>
        </View>

        {/* ── TÍTULO OS ── */}
        <Text style={s.osTitle}>Ordem de Serviço N° {numeroOS}</Text>

        {/* ── CLIENTE + META OS ── */}
        <Text style={s.sectionLabel}>Cliente</Text>
        <View style={s.clienteBlock}>
          {/* Dados do cliente */}
          <View style={s.clienteBox}>
            <Text style={s.clienteNome}>{cliente}</Text>
            {clienteCnpj ? (
              <Text style={s.clienteDetalhe}>{clienteCnpj}</Text>
            ) : null}
            {clienteEndereco ? (
              <Text style={s.clienteDetalhe}>{clienteEndereco}</Text>
            ) : null}
            {clienteBairro ? (
              <Text style={s.clienteDetalhe}>Bairro: {clienteBairro}</Text>
            ) : null}
            {clienteCidade ? (
              <Text style={s.clienteDetalhe}>{clienteCidade}</Text>
            ) : null}
          </View>

          {/* Meta OS */}
          <View style={s.osMeta}>
            <View style={s.osMetaRow}>
              <View style={s.osMetaCell}>
                <Text style={s.osMetaLabel}>Número da OS</Text>
                <Text style={s.osMetaValue}>{numeroOS}</Text>
              </View>
              <View style={s.osMetaCell}>
                <Text style={s.osMetaLabel}>Data de entrada</Text>
                <Text style={s.osMetaValue}>{dataEntrada}</Text>
              </View>
              <View style={s.osMetaCell}>
                <Text style={s.osMetaLabel}>Hora Início</Text>
                <Text style={s.osMetaValue}>{horaInicio}</Text>
              </View>
            </View>
            <View style={s.osMetaRow}>
              <View style={s.osMetaCell}>
                <Text style={s.osMetaLabel}>Data prevista</Text>
                <Text style={s.osMetaValue}>{dataPrevista}</Text>
              </View>
              <View style={s.osMetaCell}>
                <Text style={s.osMetaLabel}>Data de conclusão</Text>
                <Text style={s.osMetaValue}>{dataConclusao}</Text>
              </View>
              <View style={s.osMetaCell}>
                <Text style={s.osMetaLabel}>Hora de Término</Text>
                <Text style={s.osMetaValue}>{horaTermino}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── EQUIPAMENTO ── */}
        <Text style={s.sectionLabel}>Equipamento</Text>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
          <View style={[s.fieldBox, { flex: 2 }]}>
            <Text style={s.fieldLabel}>Equipamento / Frota</Text>
            <Text style={s.fieldValue}>{equipamento}</Text>
          </View>
          <View style={[s.fieldBox, { flex: 1 }]}>
            <Text style={s.fieldLabel}>Número de série</Text>
            <Text style={s.fieldValue}>{numeroSerie}</Text>
          </View>
        </View>

        {/* ── PROBLEMA ── */}
        <Text style={s.sectionLabel}>Problema</Text>
        <View style={[s.fieldBox, { minHeight: 24 }]}>
          <Text style={s.fieldValue}>{problema}</Text>
        </View>

        {/* ── SERVIÇOS ── */}
        <Text style={s.sectionLabel}>Serviços</Text>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDescS]}>Descrição</Text>
          <Text style={[s.tableHeaderText, s.colCodS]}>Código</Text>
          <Text style={[s.tableHeaderText, s.colHorasS]}>Horas</Text>
          <Text style={[s.tableHeaderText, s.colPrecoS]}>Preço</Text>
          <Text style={[s.tableHeaderText, s.colTotalS]}>Valor total</Text>
        </View>
        {servicos.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={{ fontSize: 7.5, color: "#aaa" }}>Nenhum serviço</Text>
          </View>
        ) : (
          servicos.map((sv, i) => (
            <View
              key={sv.id}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[{ fontSize: 7.5 }, s.colDescS]}>
                {sv.descricao}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colCodS]}>
                {sv.codigo ?? ""}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colHorasS]}>{sv.horas}</Text>
              <Text style={[{ fontSize: 7.5 }, s.colPrecoS]}>
                {fmt(sv.precoHora)}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colTotalS]}>
                {fmt(sv.horas * sv.precoHora)}
              </Text>
            </View>
          ))
        )}

        {/* ── PEÇAS ── */}
        <Text style={s.sectionLabel}>Peças</Text>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDescP]}>Descrição</Text>
          <Text style={[s.tableHeaderText, s.colCodP]}>Código</Text>
          <Text style={[s.tableHeaderText, s.colQtdP]}>Quantidade</Text>
          <Text style={[s.tableHeaderText, s.colUnP]}>UN</Text>
          <Text style={[s.tableHeaderText, s.colPrecoP]}>Preço un</Text>
          <Text style={[s.tableHeaderText, s.colTotalP]}>Valor total</Text>
        </View>
        {pecas.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={{ fontSize: 7.5, color: "#aaa" }}>Nenhuma peça</Text>
          </View>
        ) : (
          pecas.map((p, i) => (
            <View
              key={p.id}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[{ fontSize: 7.5 }, s.colDescP]}>{p.descricao}</Text>
              <Text style={[{ fontSize: 7.5 }, s.colCodP]}>
                {p.codigo ?? ""}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colQtdP]}>
                {p.quantidade.toFixed(2)}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colUnP]}>
                {p.unidade ?? "UN"}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colPrecoP]}>
                {fmt(p.precoUnitario)}
              </Text>
              <Text style={[{ fontSize: 7.5 }, s.colTotalP]}>
                {fmt(p.quantidade * p.precoUnitario)}
              </Text>
            </View>
          ))
        )}

        {/* ── TOTAIS ── */}
        <View style={s.totalsRow}>
          <View style={s.totalsCell}>
            <Text style={s.totalsLabel}>Total serviços</Text>
            <Text style={s.totalsValue}>{fmt(totalServicos)}</Text>
          </View>
          <View style={s.totalsCell}>
            <Text style={s.totalsLabel}>Total peças</Text>
            <Text style={s.totalsValue}>{fmt(totalPecas)}</Text>
          </View>
          <View style={s.totalsCellLast}>
            <Text style={s.totalsLabelWhite}>Total da ordem de serviço</Text>
            <Text style={s.totalsValueWhite}>{fmt(totalGeral)}</Text>
          </View>
        </View>

        {/* ── OBSERVAÇÕES ── */}
        {obsRecebimento || obsServico || infoTecnico ? (
          <>
            {obsRecebimento ? (
              <>
                <Text style={s.sectionLabel}>Observações do recebimento</Text>
                <View style={[s.fieldBox, { minHeight: 18 }]}>
                  <Text style={s.fieldValue}>{obsRecebimento}</Text>
                </View>
              </>
            ) : null}
            {obsServico ? (
              <>
                <Text style={s.sectionLabel}>Observações do Serviço</Text>
                <View style={[s.fieldBox, { minHeight: 18 }]}>
                  <Text style={s.fieldValue}>{obsServico}</Text>
                </View>
              </>
            ) : null}
            {infoTecnico ? (
              <>
                <Text style={s.sectionLabel}>Informações do Técnico</Text>
                <View style={[s.fieldBox, { minHeight: 18 }]}>
                  <Text style={s.fieldValue}>{infoTecnico}</Text>
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {/* ── ASSINATURA ── */}
        <Text style={[s.sectionLabel, { marginTop: 16 }]}>Técnico(s):</Text>
        <Text style={{ fontSize: 7.5, color: "#555", marginBottom: 12 }}>
          Concordo com os termos descritos acima.
        </Text>
        <View style={s.signatureArea}>
          <View style={s.signatureLine}>
            <Text style={s.signatureLabel}>Data ____/____/________</Text>
          </View>
          <View style={s.signatureLine}>
            <Text style={s.signatureLabel}>Assinatura do responsável</Text>
          </View>
        </View>

        {/* ── RODAPÉ ── */}
        <Text style={s.footer}>
          {nomeEmpresa} — Documento gerado em{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </Text>
      </Page>
    </Document>
  );
}
