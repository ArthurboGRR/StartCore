/**
 * StartCore — modelo de dados.
 *
 * Reúne as listas de opções do sistema, os materiais de exemplo e as regras
 * que não dependem do DOM (progresso, normalização de texto etc.).
 * Fica separado da interface para ser fácil de ler, reutilizar e testar.
 */
const Materiais = (() => {
    'use strict';

    /* ------------------------------------------------- listas de opções --- */

    const DISCIPLINAS = [
        { valor: 'Computabilidade', curto: 'Computabilidade' },
        { valor: 'Desenvolvimento de Interfaces Web', curto: 'Des. Interfaces Web' },
        { valor: 'Fundamentos de Engenharia de Software', curto: 'Fund. Eng. de Software' },
        { valor: 'Introdução a Algoritmos', curto: 'Int. a Algoritmos' },
        { valor: 'Introdução à Computação', curto: 'Int. à Computação' },
        { valor: 'Filosofia', curto: 'Filosofia' },
        { valor: 'Trabalho Interdisciplinar', curto: 'T. Interdisciplinar 1' },
    ];

    const TIPOS = [
        { valor: 'video', rotulo: 'Vídeo' },
        { valor: 'artigo', rotulo: 'Artigo' },
        { valor: 'pdf', rotulo: 'PDF / Livro' },
    ];

    const DIFICULDADES = [
        { valor: 'facil', rotulo: 'Fácil' },
        { valor: 'medio', rotulo: 'Médio' },
        { valor: 'dificil', rotulo: 'Difícil' },
    ];

    const STATUS = [
        { valor: 'a-estudar', rotulo: 'A estudar' },
        { valor: 'em-andamento', rotulo: 'Em Andamento' },
        { valor: 'concluido', rotulo: 'Concluído' },
    ];

    const ORDENACOES = [
        { valor: 'data-desc', rotulo: 'Data de cadastro (mais recentes)' },
        { valor: 'data-asc', rotulo: 'Data de cadastro (mais antigos)' },
        { valor: 'titulo-asc', rotulo: 'Título (A–Z)' },
        { valor: 'titulo-desc', rotulo: 'Título (Z–A)' },
        { valor: 'avaliacao-desc', rotulo: 'Avaliação (maior primeiro)' },
    ];

    const valores = (lista) => lista.map((item) => item.valor);

    /** Devolve o texto de exibição de um valor (ou o próprio valor, se não houver). */
    function rotuloDe(lista, valor, campo = 'rotulo') {
        const item = lista.find((opcao) => opcao.valor === valor);
        return item ? item[campo] : valor;
    }

    /* ------------------------------------------------ materiais de exemplo --- */

    /** Carregados apenas na primeira visita, quando o localStorage ainda está vazio. */
    function criarMateriaisIniciais() {
        return [
            {
                id: 'exemplo-1',
                titulo: 'Lógica Proposicional',
                disciplina: 'Computabilidade',
                tipo: 'artigo',
                dificuldade: 'dificil',
                status: 'a-estudar',
                links: ['https://pt.wikipedia.org/wiki/L%C3%B3gica_proposicional'],
                anexos: [{ nome: 'logica-proposicional.pdf', tamanho: 245760 }],
                resumo: 'Artigo conceitual sobre lógica proposicional e suas variações.',
                criadoEm: '2026-03-15',
                avaliacao: 5,
                etapas: [
                    { texto: 'Ler seções 1 e 2 do artigo', feita: false },
                    { texto: 'Fazer exercícios', feita: false },
                ],
                anotacoes: [],
                conceitos: [
                    {
                        titulo: 'Proposição',
                        resumo: 'Uma proposição é um conteúdo de uma asserção ou o significado de uma frase declarativa que pode ser classificado exclusivamente como verdadeiro ou falso.',
                        url: 'https://pt.wikipedia.org/wiki/Proposi%C3%A7%C3%A3o',
                    },
                ],
            },
            {
                id: 'exemplo-2',
                titulo: 'HTML e CSS',
                disciplina: 'Desenvolvimento de Interfaces Web',
                tipo: 'video',
                dificuldade: 'medio',
                status: 'concluido',
                links: [
                    'https://developer.mozilla.org/pt-BR/docs/Web/HTML',
                    'https://developer.mozilla.org/pt-BR/docs/Web/CSS',
                ],
                anexos: [
                    { nome: 'roteiro-html.pdf', tamanho: 102400 },
                    { nome: 'exercicios-css.pdf', tamanho: 87040 },
                ],
                resumo: 'Vídeo explicativo sobre codificação em HTML e CSS.',
                criadoEm: '2026-03-12',
                avaliacao: 5,
                etapas: [
                    { texto: 'Assistir à videoaula completa', feita: true },
                    { texto: 'Reproduzir os exemplos no editor', feita: true },
                ],
                anotacoes: [
                    { texto: 'Revisar seletores e flexbox antes da prova.', em: '2026-03-13T14:30:00' },
                ],
                conceitos: [
                    {
                        titulo: 'HTML',
                        resumo: 'HTML (HyperText Markup Language) é uma linguagem de marcação utilizada na construção de páginas na Web. Documentos HTML podem ser interpretados por navegadores.',
                        url: 'https://pt.wikipedia.org/wiki/HTML',
                    },
                ],
            },
            {
                id: 'exemplo-3',
                titulo: 'Experiência do Pensar Filosófico',
                disciplina: 'Filosofia',
                tipo: 'pdf',
                dificuldade: 'facil',
                status: 'em-andamento',
                links: ['https://pt.wikipedia.org/wiki/Plat%C3%A3o'],
                anexos: [
                    { nome: 'experiencia-do-pensar.pdf', tamanho: 512000 },
                    { nome: 'fichamento.docx', tamanho: 30720 },
                ],
                resumo: 'Livro da teoria de Platão.',
                criadoEm: '2026-03-08',
                avaliacao: 5,
                etapas: [
                    { texto: 'Ler o capítulo 1', feita: true },
                    { texto: 'Fazer o fichamento', feita: false },
                ],
                anotacoes: [
                    { texto: 'Anotar a alegoria da caverna para a A1.', em: '2026-03-09T10:15:00' },
                    { texto: 'Comparar com o texto de Aristóteles.', em: '2026-03-10T19:40:00' },
                ],
                conceitos: [],
            },
        ];
    }

    /* ------------------------------------------------------------ regras --- */

    /** Remove acentos e maiúsculas para comparar textos ("Lógica" = "logica"). */
    function normalizarTexto(texto) {
        return String(texto ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    /** Progresso do período: quantos materiais estão concluídos. */
    function calcularProgresso(lista) {
        const total = lista.length;
        const concluidos = lista.filter((item) => item.status === 'concluido').length;
        return {
            total,
            concluidos,
            pendentes: total - concluidos,
            percentual: total === 0 ? 0 : Math.round((concluidos / total) * 100),
        };
    }

    /**
     * Confere um registro vindo do localStorage e preenche o que faltar.
     * Devolve null quando o registro não tem o mínimo para ser exibido.
     */
    function reconstruirMaterial(bruto) {
        if (!bruto || typeof bruto !== 'object') return null;
        if (typeof bruto.id !== 'string' || typeof bruto.titulo !== 'string' || !bruto.titulo.trim()) return null;

        const listaDe = (valor) => (Array.isArray(valor) ? valor : []);
        const nota = Number(bruto.avaliacao);

        return {
            id: bruto.id,
            titulo: bruto.titulo.trim(),
            disciplina: String(bruto.disciplina ?? ''),
            tipo: valores(TIPOS).includes(bruto.tipo) ? bruto.tipo : 'artigo',
            dificuldade: valores(DIFICULDADES).includes(bruto.dificuldade) ? bruto.dificuldade : 'medio',
            status: valores(STATUS).includes(bruto.status) ? bruto.status : 'a-estudar',
            links: listaDe(bruto.links).filter((link) => typeof link === 'string'),
            anexos: listaDe(bruto.anexos).filter((anexo) => anexo && typeof anexo.nome === 'string'),
            resumo: String(bruto.resumo ?? ''),
            criadoEm: String(bruto.criadoEm ?? new Date().toISOString().slice(0, 10)),
            avaliacao: Number.isInteger(nota) && nota >= 0 && nota <= 5 ? nota : 0,
            etapas: listaDe(bruto.etapas).filter((etapa) => etapa && typeof etapa.texto === 'string'),
            anotacoes: listaDe(bruto.anotacoes).filter((nota_) => nota_ && typeof nota_.texto === 'string'),
            conceitos: listaDe(bruto.conceitos).filter((conceito) => conceito && typeof conceito.titulo === 'string'),
        };
    }

    /* ------------------------------------------- validação e criação --- */

    const LIMITES = { tituloMin: 3, tituloMax: 80, resumoMin: 10, resumoMax: 500, linksMax: 5 };

    /** Aceita apenas endereços http/https com domínio (ex.: https://site.com). */
    function ehUrlValida(texto) {
        try {
            const url = new URL(texto);
            return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
        } catch (erro) {
            return false;
        }
    }

    /** Data de hoje no formato AAAA-MM-DD, no fuso do usuário. */
    function hoje() {
        const agora = new Date();
        const dois = (n) => String(n).padStart(2, '0');
        return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
    }

    /** Data e hora atuais (AAAA-MM-DDTHH:MM:SS), no fuso do usuário. */
    function agora() {
        const d = new Date();
        const dois = (n) => String(n).padStart(2, '0');
        return `${hoje()}T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
    }

    function gerarId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /**
     * Valida os dados do formulário.
     * Devolve { ok, erros }, onde erros é um objeto campo -> mensagem
     * (links usam as chaves "link-0", "link-1"...).
     * idAtual identifica o material em edição, para não acusar duplicidade consigo mesmo.
     */
    function validarMaterial(dados, existentes, idAtual = null) {
        const erros = {};
        const titulo = String(dados.titulo ?? '').trim();
        const resumo = String(dados.resumo ?? '').trim();

        if (!titulo) erros.titulo = 'Informe o título do conteúdo.';
        else if (titulo.length < LIMITES.tituloMin) erros.titulo = `O título deve ter ao menos ${LIMITES.tituloMin} caracteres.`;
        else if (titulo.length > LIMITES.tituloMax) erros.titulo = `O título deve ter até ${LIMITES.tituloMax} caracteres.`;
        else {
            const repetido = existentes.some((item) => item.id !== idAtual
                && item.disciplina === dados.disciplina
                && normalizarTexto(item.titulo) === normalizarTexto(titulo));
            if (repetido) erros.titulo = 'Já existe um material com este título nesta disciplina.';
        }

        if (!valores(DISCIPLINAS).includes(dados.disciplina)) erros.disciplina = 'Escolha uma disciplina.';
        if (!valores(TIPOS).includes(dados.tipo)) erros.tipo = 'Escolha o tipo de mídia.';
        if (!valores(DIFICULDADES).includes(dados.dificuldade)) erros.dificuldade = 'Escolha a dificuldade.';
        if (!valores(STATUS).includes(dados.status)) erros.status = 'Escolha o status.';

        const links = Array.isArray(dados.links) ? dados.links.map((link) => String(link).trim()) : [];
        if (!links.some(Boolean)) erros['link-0'] = 'Informe ao menos um link.';
        links.forEach((link, indice) => {
            if (link && !ehUrlValida(link)) erros[`link-${indice}`] = 'Use um endereço válido, como https://site.com/pagina.';
        });

        if (!resumo) erros.resumo = 'Escreva um resumo do conteúdo.';
        else if (resumo.length < LIMITES.resumoMin) erros.resumo = `O resumo deve ter ao menos ${LIMITES.resumoMin} caracteres.`;
        else if (resumo.length > LIMITES.resumoMax) erros.resumo = `O resumo deve ter até ${LIMITES.resumoMax} caracteres.`;

        return { ok: Object.keys(erros).length === 0, erros };
    }

    /** Limpa os links (sem vazios nem repetidos). */
    function limparLinks(links) {
        return [...new Set(links.map((link) => String(link).trim()).filter(Boolean))];
    }

    /** Aplica os dados do formulário de edição a um material existente. */
    function aplicarEdicao(material, dados) {
        material.titulo = dados.titulo.trim();
        material.disciplina = dados.disciplina;
        material.tipo = dados.tipo;
        material.dificuldade = dados.dificuldade;
        material.status = dados.status;
        material.links = limparLinks(dados.links);
        material.anexos = dados.anexos ?? [];
        material.resumo = dados.resumo.trim();
        return material;
    }

    /** Cria um material novo a partir de dados já validados. */
    function criarMaterial(dados) {
        return {
            id: gerarId(),
            titulo: dados.titulo.trim(),
            disciplina: dados.disciplina,
            tipo: dados.tipo,
            dificuldade: dados.dificuldade,
            status: dados.status,
            links: limparLinks(dados.links),
            anexos: dados.anexos ?? [],
            resumo: dados.resumo.trim(),
            criadoEm: hoje(),
            avaliacao: 0,
            etapas: [
                { texto: 'Estudar o conteúdo principal', feita: dados.status === 'concluido' },
                { texto: 'Registrar anotações de revisão', feita: dados.status === 'concluido' },
            ],
            anotacoes: [],
            conceitos: dados.conceitos ?? [],
        };
    }

    /* -------------------------------------------------- pesquisa e filtros --- */

    /** Texto em que a pesquisa procura: título, resumo, disciplina, tipo, conceitos e anotações. */
    function textoPesquisavel(material) {
        return normalizarTexto([
            material.titulo,
            material.resumo,
            material.disciplina,
            rotuloDe(DISCIPLINAS, material.disciplina, 'curto'),
            rotuloDe(TIPOS, material.tipo),
            ...material.conceitos.map((conceito) => conceito.titulo),
            ...material.anotacoes.map((nota) => nota.texto),
        ].join(' '));
    }

    /**
     * Aplica a pesquisa e os filtros da tela.
     * consulta.busca: todas as palavras digitadas precisam aparecer no texto do
     *   material (sem diferenciar acentos nem maiúsculas).
     * consulta.disciplina / status / tipo / dificuldade: quando preenchidos, o
     *   material precisa ter exatamente aquele valor.
     */
    function filtrar(lista, consulta) {
        const palavras = normalizarTexto(consulta.busca).split(/\s+/).filter(Boolean);
        return lista.filter((material) => {
            if (consulta.disciplina && material.disciplina !== consulta.disciplina) return false;
            if (consulta.status && material.status !== consulta.status) return false;
            if (consulta.tipo && material.tipo !== consulta.tipo) return false;
            if (consulta.dificuldade && material.dificuldade !== consulta.dificuldade) return false;
            const texto = textoPesquisavel(material);
            return palavras.every((palavra) => texto.includes(palavra));
        });
    }

    /* ------------------------------------------------------- ordenação --- */

    const comparaTitulos = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base', numeric: true });

    /**
     * Devolve uma cópia da lista na ordem pedida (a original não é alterada).
     * Em empates de data, vale a ordem em que os materiais foram cadastrados.
     */
    function ordenar(lista, ordem) {
        const indexados = lista.map((material, posicao) => ({ material, posicao }));
        const regras = {
            // a lista guarda os mais novos primeiro; por isso o desempate usa a posição
            'data-desc': (a, b) => b.material.criadoEm.localeCompare(a.material.criadoEm) || a.posicao - b.posicao,
            'data-asc': (a, b) => a.material.criadoEm.localeCompare(b.material.criadoEm) || b.posicao - a.posicao,
            'titulo-asc': (a, b) => comparaTitulos(a.material, b.material),
            'titulo-desc': (a, b) => comparaTitulos(b.material, a.material),
            'avaliacao-desc': (a, b) => b.material.avaliacao - a.material.avaliacao || comparaTitulos(a.material, b.material),
        };
        const regra = regras[ordem] ?? regras['data-desc'];
        return indexados.sort(regra).map((item) => item.material);
    }

    return {
        DISCIPLINAS, TIPOS, DIFICULDADES, STATUS, ORDENACOES,
        valores, rotuloDe,
        criarMateriaisIniciais,
        LIMITES, normalizarTexto, calcularProgresso, reconstruirMaterial,
        ehUrlValida, hoje, agora, validarMaterial, limparLinks, criarMaterial, aplicarEdicao,
        textoPesquisavel, filtrar, ordenar,
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Materiais;
