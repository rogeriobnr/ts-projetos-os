import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
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

interface EmpresaDB {
  id: string;
  nome: string;
  responsavel: string;
  telefone: string;
  endereco: string;
  cnpj: string;
  logoBase64?: string;
}

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

  // ── OS ──
  const [numeroOS, setNumeroOS] = useState("");
  const [dataEntrada, setDataEntrada] = useState(
    new Date().toLocaleDateString("pt-BR"),
  );
  const [horaInicio, setHoraInicio] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [dataConclusao, setDataConclusao] = useState("");
  const [horaTermino, setHoraTermino] = useState("");

  // ── Equipamento / Obs ──
  const [equipamento, setEquipamento] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [problema, setProblema] = useState("");
  const [obsRecebimento, setObsRecebimento] = useState("");
  const [obsServico, setObsServico] = useState("");
  const [infoTecnico, setInfoTecnico] = useState("");

  // ── Itens ──
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);

  // ── UI ──
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const clienteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    carregarEmpresa();
    carregarClientes();
    gerarNumeroOS();
  }, []);

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

  const handleClienteInput = useCallback(
    (valor: string) => {
      setClienteNome(valor);

      if (clienteDebounce.current) {
        clearTimeout(clienteDebounce.current);
      }

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
      if (clienteDebounce.current) {
        clearTimeout(clienteDebounce.current);
      }
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

  const salvarOrcamento = async () => {
    if (!clienteNome.trim()) {
      showToast("Preencha o nome do Cliente!", "err");
      return;
    }
    setIsSaving(true);
    try {
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
      const ref = await addDoc(collection(db, "orcamentos"), {
        ...dadosAtuais,
        logoBase64: null,
        dataCriacao: new Date().toISOString(),
      });
      showToast(`OS #${numeroOS} salva! (${ref.id.slice(0, 8)}…)`, "ok");
      setNumeroOS((prev) => String(parseInt(prev) + 1).padStart(4, "0"));
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar.", "err");
    } finally {
      setIsSaving(false);
    }
  };

  const compartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `OS #${numeroOS} — ${empresa.nome}`,
          text: `Orçamento para ${clienteNome}: Total R$ ${totalGeral.toFixed(2)}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      showToast("Navegador não suporta partilha nativa.", "err");
    }
  };

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const inp =
    "bg-[var(--background)] border border-[var(--muted)] rounded p-2 text-[var(--foreground)] focus:border-[var(--primary)] outline-none w-full text-sm";
  const lbl = "text-xs text-[var(--muted)] mb-1 block";
  const secTitle =
    "text-sm font-bold text-[var(--primary)] uppercase tracking-wider border-l-4 border-[var(--accent)] pl-3";

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

      {/* Modal Empresa */}
      {showEmpresaModal && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--secondary)] rounded-xl shadow-2xl w-full max-w-lg p-6 border border-[var(--muted)]/30">
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

      {/* Header */}
      <header className="border-b-2 border-[var(--primary)] px-4 md:px-8 py-4 flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-[var(--primary)] uppercase tracking-wider leading-none">
              {empresa.nome}
            </h1>
            <p className="text-[var(--accent)] text-xs font-medium mt-0.5">
              Emissor de Orçamentos e OS
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowEmpresaModal(true)}
          className="text-xs border border-[var(--muted)] text-[var(--muted)] px-3 py-1.5 rounded hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          ⚙️ Empresa
        </button>
      </header>

      {/* Tabs */}
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

      {/* Preview Tab */}
      {activeTab === "preview" && (
        <div className="p-4 md:p-8">
          <div className="h-[75vh] w-full rounded-lg overflow-hidden border border-[var(--muted)]/40">
            <PDFViewer width="100%" height="100%">
              <OrcamentoPDF dados={dadosAtuais} />
            </PDFViewer>
          </div>
        </div>
      )}

      {/* Form Tab */}
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
              {[
                ["CNPJ / CPF", clienteCnpj, setClienteCnpj],
                ["Endereço", clienteEndereco, setClienteEndereco],
                ["Bairro", clienteBairro, setClienteBairro],
                ["Cidade / UF", clienteCidade, setClienteCidade],
              ].map(([label, val, setter]) => (
                <div key={label as string}>
                  <label className={lbl}>{label as string}</label>
                  <input
                    className={inp}
                    value={val as string}
                    onChange={(e) =>
                      (setter as (v: string) => void)(e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Equipamento */}
          <section className="bg-[var(--secondary)] rounded-xl border border-[var(--muted)]/30 p-5">
            <h2 className={`${secTitle} mb-4`}>Equipamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Equipamento / Frota</label>
                <input
                  className={inp}
                  placeholder="Ex: Trator John Deere"
                  value={equipamento}
                  onChange={(e) => setEquipamento(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Nº de série</label>
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
              {isSaving ? "⏳ Salvando…" : "💾 Salvar OS "}
            </button>

            <PDFDownloadLink
              document={<OrcamentoPDF dados={dadosAtuais} />}
              fileName={`OS-${numeroOS}-${clienteNome || "cliente"}.pdf`}
              className="font-bold py-4 rounded-xl text-base text-center bg-[var(--accent)] text-[var(--background)] hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              {({ loading }) =>
                loading ? "⏳ Gerando PDF…" : "📄 Download PDF"
              }
            </PDFDownloadLink>

            <button
              onClick={() => setActiveTab("preview")}
              className="border-2 border-[var(--primary)] text-[var(--primary)] font-bold py-3 rounded-xl hover:bg-[var(--primary)]/10 transition-colors"
            >
              👁️ Preview PDF
            </button>

            <button
              onClick={compartilhar}
              className="border-2 border-[var(--accent)] text-[var(--accent)] font-bold py-3 rounded-xl hover:bg-[var(--accent)]/10 transition-colors"
            >
              📤 Enviar (WhatsApp / Email)
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
