/**
 * StartCore — integração com a API pública da Wikipédia (pt.wikipedia.org).
 *
 * A busca usa a API de consulta (action=query) com um gerador de pesquisa, que
 * devolve numa única requisição o título, um resumo (introdução do verbete) e o
 * endereço de cada resultado. O parâmetro origin=* libera o acesso (CORS) a
 * partir de uma página estática, sem chave de API.
 *
 * Os conceitos encontrados alimentam o sistema: podem virar um novo material de
 * estudo ou ficar vinculados a um material já cadastrado (e então são guardados
 * no localStorage junto com ele).
 */
const Wikipedia = (() => {
    'use strict';

    const URL_API = 'https://pt.wikipedia.org/w/api.php';
    const TEMPO_LIMITE_MS = 10000;
    const RESUMO_MAX = 320;

    /** Erro com tipo: "rede", "tempo", "http" ou "cancelada". */
    class ErroBusca extends Error {
        constructor(tipo, mensagem) {
            super(mensagem);
            this.name = 'ErroBusca';
            this.tipo = tipo;
        }
    }

    /** Só aceitamos links https de domínios da Wikipédia (evita endereços inesperados). */
    function ehLinkDaWikipedia(texto) {
        try {
            const url = new URL(texto);
            return url.protocol === 'https:' && /(^|\.)wikipedia\.org$/.test(url.hostname);
        } catch (erro) {
            return false;
        }
    }

    /** Converte a resposta da API em uma lista simples de conceitos, na ordem da relevância. */
    function interpretar(resposta) {
        const paginas = resposta && resposta.query && resposta.query.pages;
        if (!paginas) return [];

        return Object.values(paginas)
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
            .map((pagina) => ({
                titulo: String(pagina.title ?? '').trim(),
                resumo: String(pagina.extract ?? '').replace(/\s+/g, ' ').trim().slice(0, RESUMO_MAX),
                url: pagina.fullurl,
            }))
            .filter((conceito) => conceito.titulo && ehLinkDaWikipedia(conceito.url));
    }

    /**
     * Pesquisa conceitos na Wikipédia.
     * signal (opcional): AbortSignal para cancelar uma busca que ficou ultrapassada.
     */
    async function buscar(termo, { limite = 5, signal } = {}) {
        const consulta = String(termo ?? '').trim();
        if (consulta.length < 2) return [];

        const parametros = new URLSearchParams({
            action: 'query',
            format: 'json',
            origin: '*',
            generator: 'search',
            gsrsearch: consulta,
            gsrlimit: String(limite),
            gsrnamespace: '0',
            prop: 'extracts|info',
            exintro: '1',
            explaintext: '1',
            exchars: String(RESUMO_MAX),
            exlimit: 'max',
            inprop: 'url',
        });

        const controle = new AbortController();
        let estourou = false;
        const relogio = setTimeout(() => { estourou = true; controle.abort(); }, TEMPO_LIMITE_MS);
        if (signal) signal.addEventListener('abort', () => controle.abort(), { once: true });

        try {
            const resposta = await fetch(`${URL_API}?${parametros}`, { signal: controle.signal });
            if (!resposta.ok) throw new ErroBusca('http', `A Wikipédia respondeu com o código ${resposta.status}.`);
            return interpretar(await resposta.json());
        } catch (erro) {
            if (erro instanceof ErroBusca) throw erro;
            if (erro.name === 'AbortError') {
                throw estourou
                    ? new ErroBusca('tempo', 'A Wikipédia demorou demais para responder.')
                    : new ErroBusca('cancelada', 'Busca cancelada.');
            }
            throw new ErroBusca('rede', 'Não foi possível acessar a Wikipédia. Verifique sua conexão.');
        } finally {
            clearTimeout(relogio);
        }
    }

    return { buscar, interpretar, ehLinkDaWikipedia, ErroBusca };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Wikipedia;
