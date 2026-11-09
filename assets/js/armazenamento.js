/**
 * StartCore — persistência com localStorage.
 *
 * Os materiais ficam guardados como JSON na chave "startcore:materiais" e são
 * recuperados sempre que a página abre. Qualquer erro de leitura ou gravação
 * (JSON corrompido, cota cheia, navegador em modo privado) é tratado aqui, para
 * a aplicação continuar funcionando.
 */
const Armazenamento = (() => {
    'use strict';

    const CHAVE_MATERIAIS = 'startcore:materiais';
    const CHAVE_ULTIMO_ACESSO = 'startcore:ultimo-acesso';
    const CHAVE_ORDEM = 'startcore:ordem';
    const VERSAO = 1;

    /**
     * Lê os materiais salvos.
     * origem: "salvo" (dados do usuário), "exemplo" (primeira visita, nada salvo)
     *         ou "recuperado" (havia dados ilegíveis, que foram descartados).
     */
    function carregarMateriais() {
        let bruto = null;
        try {
            bruto = localStorage.getItem(CHAVE_MATERIAIS);
        } catch (erro) {
            return { itens: Materiais.criarMateriaisIniciais(), origem: 'exemplo' };
        }

        if (bruto === null) {
            return { itens: Materiais.criarMateriaisIniciais(), origem: 'exemplo' };
        }

        try {
            const dados = JSON.parse(bruto);
            if (!dados || !Array.isArray(dados.itens)) throw new Error('formato inesperado');
            const itens = dados.itens.map(Materiais.reconstruirMaterial).filter(Boolean);
            return { itens, origem: 'salvo' };
        } catch (erro) {
            console.warn('StartCore: dados salvos ilegíveis, carregando exemplos.', erro);
            return { itens: Materiais.criarMateriaisIniciais(), origem: 'recuperado' };
        }
    }

    /** Grava a lista completa. Devolve false se o navegador recusar. */
    function salvarMateriais(itens) {
        try {
            localStorage.setItem(CHAVE_MATERIAIS, JSON.stringify({ versao: VERSAO, itens }));
            return true;
        } catch (erro) {
            console.warn('StartCore: não foi possível salvar.', erro);
            return false;
        }
    }

    function lerUltimoAcesso() {
        try {
            return localStorage.getItem(CHAVE_ULTIMO_ACESSO);
        } catch (erro) {
            return null;
        }
    }

    function gravarUltimoAcesso(id) {
        try {
            localStorage.setItem(CHAVE_ULTIMO_ACESSO, id);
        } catch (erro) {
            /* sem consequência: é apenas uma conveniência da tela */
        }
    }

    /** Ordem escolhida na listagem (mantida entre visitas). */
    function lerOrdem() {
        try {
            return localStorage.getItem(CHAVE_ORDEM);
        } catch (erro) {
            return null;
        }
    }

    function gravarOrdem(ordem) {
        try {
            localStorage.setItem(CHAVE_ORDEM, ordem);
        } catch (erro) {
            /* sem consequência */
        }
    }

    return { carregarMateriais, salvarMateriais, lerUltimoAcesso, gravarUltimoAcesso, lerOrdem, gravarOrdem };
})();
