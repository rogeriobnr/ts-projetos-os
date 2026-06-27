import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { pdf } from "@react-pdf/renderer";
import { OrcamentoPDF } from "./pdf/OrcamentoPDF";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Servico {
  id: string;
  descricao: string;
  codigo: string;
  horas: number;
  precoHora: number;
}

interface Peca {
  id: string;
  descricao: string;
  codigo: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
}

interface ClienteDB {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
}

interface EquipamentoDBItem {
  id: string;
  descricao: string;
  numeroSerie: string;
  fabricante: string;
  modelo: string;
}

interface EmpresaDB {
  id: string;
  nome: string;
  responsavel: string;
  telefone: string;
  endereco: string;
  cnpj: string;
  logoBase64?: string;
}

type OrcamentoDB = {
  id: string;
  numeroOS: string;
  dataEntrada: string;
  dataCriacao: string;
  cliente: string;
  equipamento: string;
  totalGeral: number;
} & Record<string, unknown>;

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function App() {
  // ── Empresa ──
  const [empresa, setEmpresa] = useState<EmpresaDB>({
    id: "",
    nome: "TS Projetos",
    responsavel: "",
    telefone: "",
    endereco: "",
    cnpj: "",
    logoBase64: "",
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  // ── Cliente ──
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [clienteBairro, setClienteBairro] = useState("");
  const [clienteCidade, setClienteCidade] = useState("");
  const [clienteSugestoes, setClienteSugestoes] = useState<ClienteDB[]>([]);
  const [showClienteSugestoes, setShowClienteSugestoes] = useState(false);
  const [clientesBanco, setClientesBanco] = useState<ClienteDB[]>([]);

  // ── Equipamento ──
  const [equipamento, setEquipamento] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [equipamentosBanco, setEquipamentosBanco] = useState<
    EquipamentoDBItem[]
  >([]);
  const [equipSugestoes, setEquipSugestoes] = useState<EquipamentoDBItem[]>([]);
  const [showEquipSugestoes, setShowEquipSugestoes] = useState(false);
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [equipModalItem, setEquipModalItem] = useState<EquipamentoDBItem>({
    id: "",
    descricao: "",
    numeroSerie: "",
    fabricante: "",
    modelo: "",
  });
  const [savingEquip, setSavingEquip] = useState(false);
  const equipDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── OS ──
  const [editandoOrcId, setEditandoOrcId] = useState<string | null>(null);
  const [numeroOS, setNumeroOS] = useState("");
  const [dataEntrada, setDataEntrada] = useState(
    new Date().toLocaleDateString("pt-BR"),
  );
  const [horaInicio, setHoraInicio] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [dataConclusao, setDataConclusao] = useState("");
  const [horaTermino, setHoraTermino] = useState("");

  // ── Obs ──
  const [problema, setProblema] = useState("");
  const [obsRecebimento, setObsRecebimento] = useState("");
  const [obsServico, setObsServico] = useState("");
  const [infoTecnico, setInfoTecnico] = useState("");

  // ── Itens ──
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);

  // ── Histórico ──
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [orcamentosBanco, setOrcamentosBanco] = useState<OrcamentoDB[]>([]);
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [confirmDeleteOrcId, setConfirmDeleteOrcId] = useState<string | null>(
    null,
  );
  const [confirmDeleteEquipId, setConfirmDeleteEquipId] = useState<
    string | null
  >(null);

  // ── UI ──
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const clienteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    carregarEmpresa();
    carregarClientes();
    carregarEquipamentos();
    gerarNumeroOS();
  }, []);

  // Gerar blob URL quando mudar para aba preview
  useEffect(() => {
    if (activeTab === "preview") {
      gerarPdfBlob();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const gerarNumeroOS = async () => {
    try {
      const snap = await getDocs(collection(db, "orcamentos"));
      setNumeroOS(String(snap.size + 1).padStart(4, "0"));
    } catch {
      setNumeroOS(String(Date.now()).slice(-4));
    }
  };

  const carregarEmpresa = async () => {
    try {
      const snap = await getDocs(collection(db, "empresa"));
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as EmpresaDB;
        setEmpresa({ ...data, id: d.id });
        if (data.logoBase64) setLogoPreview(data.logoBase64);
      }
    } catch (e) {
      console.warn("Empresa:", e);
    }
  };

  const carregarClientes = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "clientes"), orderBy("nome")),
      );
      setClientesBanco(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ClienteDB, "id">),
        })),
      );
    } catch (e) {
      console.warn("Clientes:", e);
    }
  };

  const carregarEquipamentos = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "equipamentos"), orderBy("descricao")),
      );
      setEquipamentosBanco(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EquipamentoDBItem, "id">),
        })),
      );
    } catch (e) {
      console.warn("Equipamentos:", e);
    }
  };

  const carregarOrcamentos = async () => {
    setLoadingHistorico(true);
    try {
      const snap = await getDocs(
        query(collection(db, "orcamentos"), orderBy("dataCriacao", "desc")),
      );
      setOrcamentosBanco(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrcamentoDB),
      );
    } catch (e) {
      console.warn("Orçamentos:", e);
    } finally {
      setLoadingHistorico(false);
    }
  };

  // ── Empresa ──
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      setEmpresa((prev) => ({ ...prev, logoBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const salvarEmpresa = async () => {
    setSavingEmpresa(true);
    try {
      if (empresa.id) {
        await setDoc(doc(db, "empresa", empresa.id), empresa);
      } else {
        const ref = await addDoc(collection(db, "empresa"), empresa);
        setEmpresa((prev) => ({ ...prev, id: ref.id }));
      }
      showToast("Dados da empresa salvos!", "ok");
      setShowEmpresaModal(false);
    } catch {
      showToast("Erro ao salvar empresa.", "err");
    } finally {
      setSavingEmpresa(false);
    }
  };

  // ── Cliente ──
  const handleClienteInput = useCallback(
    (valor: string) => {
      setClienteNome(valor);
      if (clienteDebounce.current) clearTimeout(clienteDebounce.current);
      if (valor.length < 2) {
        setShowClienteSugestoes(false);
        setClienteSugestoes([]);
        return;
      }
      clienteDebounce.current = setTimeout(() => {
        const filtro = clientesBanco.filter((c) =>
          c.nome.toLowerCase().includes(valor.toLowerCase()),
        );
        setClienteSugestoes(filtro.slice(0, 6));
        setShowClienteSugestoes(true);
      }, 200);
    },
    [clientesBanco],
  );

  useEffect(() => {
    return () => {
      if (clienteDebounce.current) clearTimeout(clienteDebounce.current);
    };
  }, []);

  const selecionarCliente = (c: ClienteDB) => {
    setClienteNome(c.nome);
    setClienteCnpj(c.cnpj);
    setClienteEndereco(c.endereco);
    setClienteBairro(c.bairro);
    setClienteCidade(c.cidade);
    setShowClienteSugestoes(false);
  };

  // ── Equipamento (CRUD + Busca) ──
  const handleEquipInput = useCallback(
    (valor: string) => {
      setEquipamento(valor);
      if (equipDebounce.current) clearTimeout(equipDebounce.current);
      if (valor.length < 2) {
        setShowEquipSugestoes(false);
        setEquipSugestoes([]);
        return;
      }
      equipDebounce.current = setTimeout(() => {
        const filtro = equipamentosBanco.filter(
          (e) =>
            e.descricao.toLowerCase().includes(valor.toLowerCase()) ||
            e.modelo.toLowerCase().includes(valor.toLowerCase()),
        );
        setEquipSugestoes(filtro.slice(0, 6));
        setShowEquipSugestoes(true);
      }, 200);
    },
    [equipamentosBanco],
  );

  useEffect(() => {
    return () => {
      if (equipDebounce.current) clearTimeout(equipDebounce.current);
    };
  }, []);

  const selecionarEquipamento = (e: EquipamentoDBItem) => {
    setEquipamento(e.descricao + (e.modelo ? ` — ${e.modelo}` : ""));
    setNumeroSerie(e.numeroSerie);
    setShowEquipSugestoes(false);
  };

  const abrirEquipModal = (item?: EquipamentoDBItem) => {
    setEquipModalItem(
      item || {
        id: "",
        descricao: "",
        numeroSerie: "",
        fabricante: "",
        modelo: "",
      },
    );
    setShowEquipModal(true);
  };

  const salvarEquipamento = async () => {
    if (!equipModalItem.descricao.trim()) {
      showToast("Informe a descrição do equipamento.", "err");
      return;
    }
    setSavingEquip(true);
    try {
      if (equipModalItem.id) {
        await setDoc(
          doc(db, "equipamentos", equipModalItem.id),
          equipModalItem,
        );
        setEquipamentosBanco((prev) =>
          prev.map((e) => (e.id === equipModalItem.id ? equipModalItem : e)),
        );
      } else {
        const ref = await addDoc(
          collection(db, "equipamentos"),
          equipModalItem,
        );
        const novo = { ...equipModalItem, id: ref.id };
        setEquipamentosBanco((prev) => [...prev, novo]);
      }
      showToast("Equipamento salvo!", "ok");
      setShowEquipModal(false);
    } catch {
      showToast("Erro ao salvar equipamento.", "err");
    } finally {
      setSavingEquip(false);
    }
  };

  const excluirEquipamento = async (id: string) => {
    try {
      await deleteDoc(doc(db, "equipamentos", id));
      setEquipamentosBanco((prev) => prev.filter((e) => e.id !== id));
      setConfirmDeleteEquipId(null);
      showToast("Equipamento excluído.", "ok");
    } catch {
      showToast("Erro ao excluir equipamento.", "err");
    }
  };

  const excluirOrcamento = async (id: string) => {
    try {
      await deleteDoc(doc(db, "orcamentos", id));
      setOrcamentosBanco((prev) => prev.filter((o) => o.id !== id));
      setConfirmDeleteOrcId(null);
      if (editandoOrcId === id) novaOS();
      showToast("OS excluída.", "ok");
    } catch {
      showToast("Erro ao excluir OS.", "err");
    }
  };

  // ── Itens ──
  const addServico = () =>
    setServicos((p) => [
      ...p,
      {
        id: Date.now().toString(),
        descricao: "",
        codigo: "",
        horas: 0,
        precoHora: 0,
      },
    ]);
  const rmServico = (id: string) =>
    setServicos((p) => p.filter((s) => s.id !== id));
  const upServico = <K extends keyof Servico>(
    id: string,
    campo: K,
    valor: Servico[K],
  ) =>
    setServicos((p) =>
      p.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)),
    );

  const addPeca = () =>
    setPecas((p) => [
      ...p,
      {
        id: Date.now().toString(),
        descricao: "",
        codigo: "",
        quantidade: 0,
        unidade: "UN",
        precoUnitario: 0,
      },
    ]);
  const rmPeca = (id: string) => setPecas((p) => p.filter((x) => x.id !== id));
  const upPeca = <K extends keyof Peca>(id: string, campo: K, valor: Peca[K]) =>
    setPecas((p) => p.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));

  const totalServicos = servicos.reduce((a, s) => a + s.horas * s.precoHora, 0);
  const totalPecas = pecas.reduce(
    (a, p) => a + p.quantidade * p.precoUnitario,
    0,
  );
  const totalGeral = totalServicos + totalPecas;

  const dadosAtuais = {
    logoBase64: empresa.logoBase64,
    nomeEmpresa: empresa.nome,
    responsavel: empresa.responsavel,
    telefone: empresa.telefone,
    endereco: empresa.endereco,
    cnpj: empresa.cnpj,
    numeroOS,
    dataEntrada,
    horaInicio,
    dataPrevista,
    dataConclusao,
    horaTermino,
    cliente: clienteNome,
    clienteCnpj,
    clienteEndereco,
    clienteBairro,
    clienteCidade,
    equipamento,
    numeroSerie,
    problema,
    obsRecebimento,
    obsServico,
    infoTecnico,
    servicos,
    pecas,
    totalServicos,
    totalPecas,
    totalGeral,
  };

  // ── PDF Blob (compatível mobile) ──
  const gerarPdfBlob = async () => {
    setGeneratingPreview(true);
    try {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const blob = await pdf(<OrcamentoPDF dados={dadosAtuais} />).toBlob();
      const fileName = `OS-${numeroOS}-${clienteNome || "cliente"}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });
      const url = URL.createObjectURL(file);
      setPdfBlobUrl(url);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      showToast("Erro ao gerar PDF.", "err");
    } finally {
      setGeneratingPreview(false);
    }
  };

  // ── Compartilhar com PDF real ──
  const compartilhar = async () => {
    setIsSharing(true);
    try {
      const blob = await pdf(<OrcamentoPDF dados={dadosAtuais} />).toBlob();
      const fileName = `OS-${numeroOS}-${clienteNome || "cliente"}.pdf`;

      if (
        navigator.canShare &&
        navigator.canShare({
          files: [new File([blob], fileName, { type: "application/pdf" })],
        })
      ) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        await navigator.share({
          title: `OS #${numeroOS} — ${empresa.nome}`,
          text: `Orçamento para ${clienteNome || "cliente"}: Total R$ ${totalGeral.toFixed(2)}`,
          files: [file],
        });
      } else if (navigator.share) {
        // Fallback: compartilhar sem arquivo (desktop sem suporte a files)
        await navigator.share({
          title: `OS #${numeroOS} — ${empresa.nome}`,
          text: `Orçamento para ${clienteNome || "cliente"}: Total R$ ${totalGeral.toFixed(2)}`,
        });
      } else {
        // Fallback final: download direto
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(
          "PDF baixado (compartilhamento não disponível neste navegador).",
          "ok",
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        showToast("Erro ao compartilhar PDF.", "err");
      }
    } finally {
      setIsSharing(false);
    }
  };

  // ── Download PDF ──
  const downloadPdf = async () => {
    try {
      const blob = await pdf(<OrcamentoPDF dados={dadosAtuais} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OS-${numeroOS}-${clienteNome || "cliente"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Erro ao gerar PDF.", "err");
    }
  };

  // ── Salvar ──
  const salvarOrcamento = async () => {
    if (!clienteNome.trim()) {
      showToast("Preencha o nome do Cliente!", "err");
      return;
    }
    setIsSaving(true);
    try {
      // Salva ou atualiza cliente
      const existe = clientesBanco.find(
        (c) => c.nome.toLowerCase() === clienteNome.toLowerCase(),
      );
      if (!existe) {
        const ref = await addDoc(collection(db, "clientes"), {
          nome: clienteNome,
          cnpj: clienteCnpj,
          endereco: clienteEndereco,
          bairro: clienteBairro,
          cidade: clienteCidade,
        });
        setClientesBanco((prev) => [
          ...prev,
          {
            id: ref.id,
            nome: clienteNome,
            cnpj: clienteCnpj,
            endereco: clienteEndereco,
            bairro: clienteBairro,
            cidade: clienteCidade,
          },
        ]);
      }

      const payload = {
        ...dadosAtuais,
        logoBase64: null,
        dataCriacao: new Date().toISOString(),
      };

      if (editandoOrcId) {
        // Atualizar OS existente
        await updateDoc(doc(db, "orcamentos", editandoOrcId), payload);
        showToast(`OS #${numeroOS} atualizada!`, "ok");
      } else {
        // Nova OS
        const ref = await addDoc(collection(db, "orcamentos"), payload);
        showToast(`OS #${numeroOS} salva! (${ref.id.slice(0, 8)}…)`, "ok");
        setNumeroOS((prev) => String(parseInt(prev) + 1).padStart(4, "0"));
      }
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar.", "err");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Carregar OS para edição ──
  const carregarOrcamentoParaEdicao = (orc: OrcamentoDB) => {
    setEditandoOrcId(orc.id);
    setNumeroOS((orc.numeroOS as string) || "");
    setDataEntrada((orc.dataEntrada as string) || "");
    setHoraInicio((orc.horaInicio as string) || "");
    setDataPrevista((orc.dataPrevista as string) || "");
    setDataConclusao((orc.dataConclusao as string) || "");
    setHoraTermino((orc.horaTermino as string) || "");
    setClienteNome((orc.cliente as string) || "");
    setClienteCnpj((orc.clienteCnpj as string) || "");
    setClienteEndereco((orc.clienteEndereco as string) || "");
    setClienteBairro((orc.clienteBairro as string) || "");
    setClienteCidade((orc.clienteCidade as string) || "");
    setEquipamento((orc.equipamento as string) || "");
    setNumeroSerie((orc.numeroSerie as string) || "");
    setProblema((orc.problema as string) || "");
    setObsRecebimento((orc.obsRecebimento as string) || "");
    setObsServico((orc.obsServico as string) || "");
    setInfoTecnico((orc.infoTecnico as string) || "");
    setServicos((orc.servicos as Servico[]) || []);
    setPecas((orc.pecas as Peca[]) || []);
    setShowHistoricoModal(false);
    setActiveTab("form");
    showToast(`OS #${orc.numeroOS} carregada para edição.`, "ok");
  };

  const novaOS = () => {
    setEditandoOrcId(null);
    setClienteNome("");
    setClienteCnpj("");
    setClienteEndereco("");
    setClienteBairro("");
    setClienteCidade("");
    setEquipamento("");
    setNumeroSerie("");
    setProblema("");
    setObsRecebimento("");
    setObsServico("");
    setInfoTecnico("");
    setServicos([]);
    setPecas([]);
    setHoraInicio("");
    setDataPrevista("");
    setDataConclusao("");
    setHoraTermino("");
    setDataEntrada(new Date().toLocaleDateString("pt-BR"));
    gerarNumeroOS();
  };

  const orcamentosFiltrados = orcamentosBanco.filter((o) => {
    const q = buscaHistorico.toLowerCase();
    return (
      !q ||
      (o.numeroOS || "").toLowerCase().includes(q) ||
      (o.cliente || "").toLowerCase().includes(q) ||
      (o.equipamento || "").toLowerCase().includes(q)
    );
  });

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Estilos reutilizáveis ──
  const inp =
    "bg-[var(--background)] border border-[var(--muted)] rounded p-2 text-[var(--foreground)] focus:border-[var(--primary)] outline-none w-full text-sm";
  const lbl = "text-xs text-[var(--muted)] mb-1 block";
  const secTitle =
    "text-sm font-bold text-[var(--primary)] uppercase tracking-wider border-l-4 border-[var(--accent)] pl-3";

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-xl text-white text-sm font-medium ${toast.type === "ok" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.type === "ok" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── Modal Empresa ── */}
      {showEmpresaModal && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--secondary)] rounded-xl shadow-2xl w-full max-w-lg p-6 border border-[var(--muted)]/30 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--primary)] mb-5">
              ⚙️ Dados da Empresa / Prestador
            </h2>
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--primary)] flex items-center justify-center cursor-pointer overflow-hidden bg-[var(--background)]"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-[var(--muted)] text-center px-2">
                    Clique para enviar logo
                  </span>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <div>
                <p className="text-xs text-[var(--muted)] mb-2">
                  Recomendado: 300×200px · PNG ou JPG
                </p>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="text-xs border border-[var(--primary)] text-[var(--primary)] px-3 py-1 rounded hover:bg-[var(--primary)]/10"
                >
                  📁 Selecionar imagem
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Nome da empresa", "nome"],
                  ["Responsável", "responsavel"],
                  ["Telefone", "telefone"],
                  ["CNPJ", "cnpj"],
                ] as [string, keyof EmpresaDB][]
              ).map(([label, key]) => (
                <div key={key}>
                  <label className={lbl}>{label}</label>
                  <input
                    className={inp}
                    value={empresa[key] as string}
                    onChange={(e) =>
                      setEmpresa((p) => ({ ...p, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className={lbl}>Endereço completo</label>
                <input
                  className={inp}
                  value={empresa.endereco}
                  onChange={(e) =>
                    setEmpresa((p) => ({ ...p, endereco: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowEmpresaModal(false)}
                className="flex-1 border border-[var(--muted)] py-2 rounded text-sm text-[var(--muted)] hover:bg-[var(--muted)]/10"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEmpresa}
                disabled={savingEmpresa}
                className="flex-1 bg-[var(--primary)] text-white py-2 rounded text-sm font-bold hover:bg-[var(--success)] disabled:opacity-50"
              >
                {savingEmpresa ? "Salvando…" : "💾 Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Equipamento (CRUD) ── */}
      {showEquipModal && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--secondary)] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[var(--muted)]/30 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--primary)] mb-5">
              🔧 {equipModalItem.id ? "Editar" : "Cadastrar"} Equipamento
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Descrição / Nome *</label>
                <input
                  className={inp}
                  placeholder="Ex: Trator John Deere 6110J"
                  value={equipModalItem.descricao}
                  onChange={(e) =>
                    setEquipModalItem((p) => ({
                      ...p,
                      descricao: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={lbl}>Fabricante</label>
                <input
                  className={inp}
                  value={equipModalItem.fabricante}
                  onChange={(e) =>
                    setEquipModalItem((p) => ({
                      ...p,
                      fabricante: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className={lbl}>Modelo</label>
                <input
                  className={inp}
                  value={equipModalItem.modelo}
                  onChange={(e) =>
                    setEquipModalItem((p) => ({ ...p, modelo: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Número de Série</label>
                <input
                  className={inp}
                  value={equipModalItem.numeroSerie}
                  onChange={(e) =>
                    setEquipModalItem((p) => ({
                      ...p,
                      numeroSerie: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowEquipModal(false)}
                className="flex-1 border border-[var(--muted)] py-2 rounded text-sm text-[var(--muted)] hover:bg-[var(--muted)]/10"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEquipamento}
                disabled={savingEquip}
                className="flex-1 bg-[var(--primary)] text-white py-2 rounded text-sm font-bold hover:bg-[var(--success)] disabled:opacity-50"
              >
                {savingEquip ? "Salvando…" : "💾 Salvar"}
              </button>
            </div>

            {/* Lista de equipamentos cadastrados */}
            {equipamentosBanco.length > 0 && (
              <div className="mt-5 border-t border-[var(--muted)]/30 pt-4">
                <p className="text-xs text-[var(--muted)] mb-2 font-semibold uppercase tracking-wide">
                  Equipamentos cadastrados ({equipamentosBanco.length})
                </p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {equipamentosBanco.map((e) => (
                    <div key={e.id}>
                      {confirmDeleteEquipId === e.id ? (
                        <div className="flex items-center justify-between px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-sm">
                          <span className="text-red-600 text-xs font-medium">
                            Excluir <strong>{e.descricao}</strong>?
                          </span>
                          <div className="flex gap-2 ml-2 shrink-0">
                            <button
                              onClick={() => setConfirmDeleteEquipId(null)}
                              className="text-xs border border-[var(--muted)] text-[var(--muted)] px-2 py-1 rounded hover:bg-[var(--muted)]/10"
                            >
                              Não
                            </button>
                            <button
                              onClick={() => excluirEquipamento(e.id)}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2 rounded bg-[var(--background)] border border-[var(--muted)]/20 text-sm">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{e.descricao}</span>
                            {e.modelo && (
                              <span className="text-[var(--muted)] ml-2 text-xs">
                                {e.modelo}
                              </span>
                            )}
                            {e.fabricante && (
                              <span className="text-[var(--muted)] ml-2 text-xs">
                                · {e.fabricante}
                              </span>
                            )}
                            {e.numeroSerie && (
                              <span className="text-[var(--muted)] ml-2 text-xs">
                                S/N: {e.numeroSerie}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2 shrink-0">
                            <button
                              onClick={() => abrirEquipModal(e)}
                              className="text-xs text-[var(--primary)] border border-[var(--primary)]/30 px-2 py-1 rounded hover:bg-[var(--primary)]/10"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setConfirmDeleteEquipId(e.id)}
                              className="text-xs text-red-500 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Histórico de Orçamentos ── */}
      {showHistoricoModal && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--secondary)] rounded-xl shadow-2xl w-full max-w-2xl p-6 border border-[var(--muted)]/30 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--primary)]">
                📋 Histórico de OS
              </h2>
              <button
                onClick={() => setShowHistoricoModal(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl"
              >
                ✕
              </button>
            </div>

            <input
              className={`${inp} mb-4`}
              placeholder="Buscar por OS, cliente ou equipamento…"
              value={buscaHistorico}
              onChange={(e) => setBuscaHistorico(e.target.value)}
            />

            {loadingHistorico ? (
              <div className="text-center py-10 text-[var(--muted)] text-sm">
                Carregando…
              </div>
            ) : orcamentosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-[var(--muted)] text-sm border border-dashed border-[var(--muted)]/30 rounded-lg">
                Nenhuma OS encontrada.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-2">
                {orcamentosFiltrados.map((orc) => (
                  <div key={orc.id}>
                    {confirmDeleteOrcId === orc.id ? (
                      <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-lg">
                        <span className="text-red-600 text-sm font-medium">
                          Excluir OS <strong>#{orc.numeroOS}</strong> de{" "}
                          {orc.cliente || "—"}?
                        </span>
                        <div className="flex gap-2 ml-3 shrink-0">
                          <button
                            onClick={() => setConfirmDeleteOrcId(null)}
                            className="border border-[var(--muted)] text-[var(--muted)] text-xs px-3 py-1.5 rounded hover:bg-[var(--muted)]/10"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => excluirOrcamento(orc.id)}
                            className="bg-red-600 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-[var(--background)] px-4 py-3 rounded-lg border border-[var(--muted)]/20">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--primary)] text-sm">
                              OS #{orc.numeroOS}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {orc.dataEntrada}
                            </span>
                          </div>
                          <p className="text-sm truncate">
                            {orc.cliente || "—"}
                          </p>
                          {orc.equipamento && (
                            <p className="text-xs text-[var(--muted)] truncate">
                              {orc.equipamento as string}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="text-sm font-bold">
                            R${" "}
                            {(orc.totalGeral || 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <button
                            onClick={() => carregarOrcamentoParaEdicao(orc)}
                            className="bg-[var(--primary)] text-white text-xs px-3 py-1.5 rounded hover:bg-[var(--success)] transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => setConfirmDeleteOrcId(orc.id)}
                            className="border border-red-500/40 text-red-500 text-xs px-2.5 py-1.5 rounded hover:bg-red-500/10 transition-colors"
                            title="Excluir OS"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="border-b-2 border-[var(--primary)] px-4 md:px-8 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo"
              className="h-12 w-auto object-contain cursor-pointer"
              onClick={() => setShowEmpresaModal(true)}
            />
          ) : (
            <div
              className="h-12 w-12 rounded-lg bg-[var(--primary)] flex items-center justify-center cursor-pointer"
              onClick={() => setShowEmpresaModal(true)}
            >
              <span className="text-white font-bold text-lg">TS</span>
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--primary)] uppercase tracking-wider leading-none">
              {empresa.nome}
            </h1>
            <p className="text-[var(--accent)] text-xs font-medium mt-0.5">
              Emissor de Orçamentos e OS
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => {
              setShowHistoricoModal(true);
              carregarOrcamentos();
            }}
            className="text-xs border border-[var(--accent)] text-[var(--accent)] px-3 py-1.5 rounded hover:bg-[var(--accent)]/10 transition-colors"
          >
            📋 Histórico
          </button>
          <button
            onClick={novaOS}
            className="text-xs border border-[var(--primary)] text-[var(--primary)] px-3 py-1.5 rounded hover:bg-[var(--primary)]/10 transition-colors"
          >
            ➕ Nova OS
          </button>
          <button
            onClick={() => setShowEmpresaModal(true)}
            className="text-xs border border-[var(--muted)] text-[var(--muted)] px-3 py-1.5 rounded hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            ⚙️ Empresa
          </button>
        </div>
      </header>

      {/* Banner de edição */}
      {editandoOrcId && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 md:px-8 py-2 flex items-center justify-between text-sm">
          <span className="text-yellow-600 font-medium">
            ✏️ Editando OS #{numeroOS} — alterações serão salvas nesta OS
          </span>
          <button
            onClick={novaOS}
            className="text-xs underline text-yellow-600 hover:text-yellow-700"
          >
            Criar nova OS
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex border-b border-[var(--muted)]/30 px-4 md:px-8">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {t === "form" ? "📝 Formulário" : "👁️ Preview PDF"}
          </button>
        ))}
      </div>

      {/* ── Preview Tab (mobile-friendly via blob URL) ── */}
      {activeTab === "preview" && (
        <div className="p-4 md:p-8">
          {generatingPreview ? (
            <div className="h-[75vh] flex items-center justify-center text-[var(--muted)]">
              ⏳ Gerando preview…
            </div>
          ) : pdfBlobUrl ? (
            <>
              {/* Desktop: iframe embutido */}
              <div className="hidden md:block h-[75vh] w-full rounded-lg overflow-hidden border border-[var(--muted)]/40">
                <iframe
                  src={pdfBlobUrl}
                  width="100%"
                  height="100%"
                  title="Preview PDF"
                />
              </div>
              {/* Mobile: botões de ação (iframe não funciona em iOS/Android) */}
              <div className="md:hidden flex flex-col gap-3">
                <div className="bg-[var(--secondary)] rounded-xl p-5 border border-[var(--muted)]/30 text-center">
                  <p className="text-2xl mb-2">📄</p>
                  <p className="font-bold text-[var(--primary)]">
                    OS #{numeroOS}
                  </p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {clienteNome || "Cliente não informado"}
                  </p>
                  <p className="text-lg font-bold mt-2">
                    R${" "}
                    {totalGeral.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[var(--accent)] text-[var(--background)] font-bold py-4 rounded-xl text-base text-center block"
                >
                  📄 Abrir PDF no navegador
                </a>
                <button
                  onClick={downloadPdf}
                  className="border-2 border-[var(--primary)] text-[var(--primary)] font-bold py-3 rounded-xl"
                >
                  ⬇️ Baixar PDF
                </button>
                <button
                  onClick={compartilhar}
                  disabled={isSharing}
                  className="border-2 border-[var(--accent)] text-[var(--accent)] font-bold py-3 rounded-xl disabled:opacity-50"
                >
                  {isSharing ? "⏳ Gerando…" : "📤 Compartilhar PDF"}
                </button>
              </div>
              {/* Desktop: botão de atualizar preview */}
              <div className="hidden md:flex gap-3 mt-3 justify-end">
                <button
                  onClick={gerarPdfBlob}
                  className="text-xs border border-[var(--muted)] text-[var(--muted)] px-3 py-1.5 rounded hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  🔄 Atualizar preview
                </button>
              </div>
            </>
          ) : (
            <div className="h-[75vh] flex items-center justify-center">
              <button
                onClick={gerarPdfBlob}
                className="bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-bold"
              >
                Gerar Preview
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Form Tab ── */}
      {activeTab === "form" && (
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
          {/* OS */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <h2 className={`${secTitle} mb-4`}>Dados da Ordem de Serviço</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Nº OS", numeroOS, setNumeroOS, "text"],
                ["Data de entrada", dataEntrada, setDataEntrada, "text"],
                ["Hora início", horaInicio, setHoraInicio, "time"],
                ["Data prevista", dataPrevista, setDataPrevista, "text"],
                ["Data conclusão", dataConclusao, setDataConclusao, "text"],
                ["Hora término", horaTermino, setHoraTermino, "time"],
              ].map(([label, val, setter, type]) => (
                <div key={label as string}>
                  <label className={lbl}>{label as string}</label>
                  <input
                    className={inp}
                    type={type as string}
                    value={val as string}
                    onChange={(e) =>
                      (setter as (v: string) => void)(e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Cliente */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <h2 className={`${secTitle} mb-4`}>Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative md:col-span-2">
                <label className={lbl}>Nome / Razão Social *</label>
                <input
                  className={inp}
                  placeholder="Digite para buscar ou cadastrar…"
                  value={clienteNome}
                  onChange={(e) => handleClienteInput(e.target.value)}
                  onBlur={() =>
                    setTimeout(() => setShowClienteSugestoes(false), 150)
                  }
                />
                {showClienteSugestoes && clienteSugestoes.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 bg-[var(--secondary)] border border-[var(--muted)] rounded-lg shadow-xl mt-1 overflow-hidden">
                    {clienteSugestoes.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => selecionarCliente(c)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--primary)]/10 border-b border-[var(--muted)]/20 last:border-0"
                      >
                        <span className="font-medium">{c.nome}</span>
                        {c.cnpj && (
                          <span className="text-[var(--muted)] ml-2 text-xs">
                            {c.cnpj}
                          </span>
                        )}
                        {c.cidade && (
                          <span className="text-[var(--muted)] ml-2 text-xs">
                            — {c.cidade}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(
                [
                  ["CNPJ / CPF", clienteCnpj, setClienteCnpj],
                  ["Endereço", clienteEndereco, setClienteEndereco],
                  ["Bairro", clienteBairro, setClienteBairro],
                  ["Cidade / UF", clienteCidade, setClienteCidade],
                ] as [string, string, (v: string) => void][]
              ).map(([label, val, setter]) => (
                <div key={label}>
                  <label className={lbl}>{label}</label>
                  <input
                    className={inp}
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Equipamento com CRUD */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className={secTitle}>Equipamento</h2>
              <button
                onClick={() => abrirEquipModal()}
                className="text-xs border border-[var(--primary)] text-[var(--primary)] px-3 py-1.5 rounded hover:bg-[var(--primary)]/10 transition-colors"
              >
                🔧 Gerenciar equipamentos
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative md:col-span-2">
                <label className={lbl}>Equipamento / Frota</label>
                <input
                  className={inp}
                  placeholder="Digite para buscar ou descreva livremente…"
                  value={equipamento}
                  onChange={(e) => handleEquipInput(e.target.value)}
                  onBlur={() =>
                    setTimeout(() => setShowEquipSugestoes(false), 150)
                  }
                />
                {showEquipSugestoes && equipSugestoes.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 bg-[var(--secondary)] border border-[var(--muted)] rounded-lg shadow-xl mt-1 overflow-hidden">
                    {equipSugestoes.map((e) => (
                      <button
                        key={e.id}
                        onMouseDown={() => selecionarEquipamento(e)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--primary)]/10 border-b border-[var(--muted)]/20 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{e.descricao}</span>
                          {e.modelo && (
                            <span className="text-[var(--muted)] ml-2 text-xs">
                              {e.modelo}
                            </span>
                          )}
                          {e.fabricante && (
                            <span className="text-[var(--muted)] ml-2 text-xs">
                              — {e.fabricante}
                            </span>
                          )}
                        </div>
                        {e.numeroSerie && (
                          <span className="text-xs text-[var(--muted)] ml-3">
                            S/N: {e.numeroSerie}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={lbl}>Nº de Série</label>
                <input
                  className={inp}
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Descrição do Problema</label>
                <textarea
                  className={`${inp} h-20 resize-none`}
                  placeholder="Descreva o defeito relatado…"
                  value={problema}
                  onChange={(e) => setProblema(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Serviços */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className={secTitle}>Mão de Obra / Serviços</h2>
              <button
                onClick={addServico}
                className="bg-[var(--primary)] hover:bg-[var(--success)] text-white text-xs py-1.5 px-3 rounded font-medium transition-colors"
              >
                + Adicionar
              </button>
            </div>
            {servicos.length > 0 && (
              <div className="hidden md:grid grid-cols-[1fr_100px_80px_90px_80px_32px] gap-2 px-2 mb-1">
                {["Descrição", "Código", "Horas", "R$/hora", "Total", ""].map(
                  (h) => (
                    <span key={h} className="text-xs text-[var(--muted)]">
                      {h}
                    </span>
                  ),
                )}
              </div>
            )}
            <div className="space-y-2">
              {servicos.map((sv) => (
                <div
                  key={sv.id}
                  className="grid grid-cols-2 md:grid-cols-[1fr_100px_80px_90px_80px_32px] gap-2 bg-[var(--background)] p-2 rounded-lg border border-[var(--muted)]/40 items-center"
                >
                  <input
                    className="col-span-2 md:col-span-1 bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm"
                    placeholder="Descrição do serviço"
                    value={sv.descricao}
                    onChange={(e) =>
                      upServico(sv.id, "descricao", e.target.value)
                    }
                  />
                  <input
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center"
                    placeholder="Código"
                    value={sv.codigo}
                    onChange={(e) => upServico(sv.id, "codigo", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Hrs"
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center"
                    value={sv.horas || ""}
                    onChange={(e) =>
                      upServico(sv.id, "horas", parseFloat(e.target.value) || 0)
                    }
                  />
                  <input
                    type="number"
                    placeholder="R$/h"
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center"
                    value={sv.precoHora || ""}
                    onChange={(e) =>
                      upServico(
                        sv.id,
                        "precoHora",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <span className="text-right text-sm font-bold text-[var(--accent)]">
                    {(sv.horas * sv.precoHora).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <button
                    onClick={() => rmServico(sv.id)}
                    className="text-[var(--destructive)] hover:opacity-70 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {servicos.length === 0 && (
                <p className="text-center text-xs text-[var(--muted)] py-6 border border-dashed border-[var(--muted)]/30 rounded-lg">
                  Nenhum serviço adicionado.
                </p>
              )}
            </div>
          </section>

          {/* Peças */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className={secTitle}>Peças / Materiais</h2>
              <button
                onClick={addPeca}
                className="bg-[var(--primary)] hover:bg-[var(--success)] text-white text-xs py-1.5 px-3 rounded font-medium transition-colors"
              >
                + Adicionar
              </button>
            </div>
            {pecas.length > 0 && (
              <div className="hidden md:grid grid-cols-[1fr_90px_70px_60px_90px_80px_32px] gap-2 px-2 mb-1">
                {["Descrição", "Código", "Qtd", "UN", "R$/un", "Total", ""].map(
                  (h) => (
                    <span key={h} className="text-xs text-[var(--muted)]">
                      {h}
                    </span>
                  ),
                )}
              </div>
            )}
            <div className="space-y-2">
              {pecas.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-2 md:grid-cols-[1fr_90px_70px_60px_90px_80px_32px] gap-2 bg-[var(--background)] p-2 rounded-lg border border-[var(--muted)]/40 items-center"
                >
                  <input
                    className="col-span-2 md:col-span-1 bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm"
                    placeholder="Descrição da peça"
                    value={p.descricao}
                    onChange={(e) => upPeca(p.id, "descricao", e.target.value)}
                  />
                  <input
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center"
                    placeholder="Código"
                    value={p.codigo}
                    onChange={(e) => upPeca(p.id, "codigo", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Qtd"
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center"
                    value={p.quantidade || ""}
                    onChange={(e) =>
                      upPeca(
                        p.id,
                        "quantidade",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <input
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center uppercase"
                    placeholder="UN"
                    value={p.unidade}
                    onChange={(e) => upPeca(p.id, "unidade", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="R$/un"
                    className="bg-transparent border-b border-[var(--muted)] focus:border-[var(--primary)] outline-none p-1 text-sm text-center"
                    value={p.precoUnitario || ""}
                    onChange={(e) =>
                      upPeca(
                        p.id,
                        "precoUnitario",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <span className="text-right text-sm font-bold text-[var(--accent)]">
                    {(p.quantidade * p.precoUnitario).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <button
                    onClick={() => rmPeca(p.id)}
                    className="text-[var(--destructive)] hover:opacity-70 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {pecas.length === 0 && (
                <p className="text-center text-xs text-[var(--muted)] py-6 border border-dashed border-[var(--muted)]/30 rounded-lg">
                  Nenhuma peça adicionada.
                </p>
              )}
            </div>
          </section>

          {/* Observações */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <h2 className={`${secTitle} mb-4`}>Observações</h2>
            <div className="space-y-3">
              {(
                [
                  ["Obs. do recebimento", obsRecebimento, setObsRecebimento],
                  ["Obs. do Serviço", obsServico, setObsServico],
                  ["Informações do Técnico", infoTecnico, setInfoTecnico],
                ] as [string, string, (v: string) => void][]
              ).map(([label, val, setter]) => (
                <div key={label}>
                  <label className={lbl}>{label}</label>
                  <input
                    className={inp}
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Totais */}
          <div className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">
                  Total Serviços
                </p>
                <p className="text-lg font-bold">
                  R${" "}
                  {totalServicos.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Total Peças</p>
                <p className="text-lg font-bold">
                  R${" "}
                  {totalPecas.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-[var(--primary)] rounded-lg p-3">
                <p className="text-xs text-white/70 mb-1">Total Geral</p>
                <p className="text-xl font-bold text-white">
                  R${" "}
                  {totalGeral.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-10">
            <button
              onClick={salvarOrcamento}
              disabled={isSaving}
              className={`font-bold py-4 rounded-xl text-base shadow-lg transition-colors ${isSaving ? "bg-[var(--muted)] cursor-not-allowed text-white" : "bg-[var(--primary)] hover:bg-[var(--success)] text-white"}`}
            >
              {isSaving
                ? "⏳ Salvando…"
                : editandoOrcId
                  ? "💾 Atualizar OS"
                  : "💾 Salvar OS"}
            </button>

            <button
              onClick={downloadPdf}
              className="font-bold py-4 rounded-xl text-base text-center bg-[var(--accent)] text-[var(--background)] hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              📄 Download PDF
            </button>

            <button
              onClick={() => setActiveTab("preview")}
              className="border-2 border-[var(--primary)] text-[var(--primary)] font-bold py-3 rounded-xl hover:bg-[var(--primary)]/10 transition-colors"
            >
              👁️ Preview PDF
            </button>

            <button
              onClick={compartilhar}
              disabled={isSharing}
              className="border-2 border-[var(--accent)] text-[var(--accent)] font-bold py-3 rounded-xl hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
            >
              {isSharing
                ? "⏳ Gerando PDF…"
                : "📤 Enviar PDF (WhatsApp / Email)"}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
