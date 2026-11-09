/**
 * Testes das regras que não dependem do navegador (assets/js/materiais.js e
 * a leitura da resposta da Wikipédia). Para rodar: node --test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const Materiais = require('../assets/js/materiais.js');
const Wikipedia = require('../assets/js/wikipedia.js');

const base = () => Materiais.criarMateriaisIniciais();

const dadosValidos = (extras = {}) => ({
    titulo: 'Árvores Binárias',
    disciplina: 'Introdução a Algoritmos',
    tipo: 'video',
    dificuldade: 'medio',
    status: 'a-estudar',
    links: ['https://exemplo.com/arvores'],
    resumo: 'Introdução às árvores binárias de busca.',
    ...extras,
});

test('normalizarTexto ignora acentos, maiúsculas e espaços nas pontas', () => {
    assert.equal(Materiais.normalizarTexto('  Lógica PROPOSICIONAL '), 'logica proposicional');
});

test('calcularProgresso conta os concluídos e arredonda o percentual', () => {
    assert.deepEqual(Materiais.calcularProgresso(base()), { total: 3, concluidos: 1, pendentes: 2, percentual: 33 });
    assert.deepEqual(Materiais.calcularProgresso([]), { total: 0, concluidos: 0, pendentes: 0, percentual: 0 });
});

test('ehUrlValida aceita apenas http/https com domínio', () => {
    assert.equal(Materiais.ehUrlValida('https://site.com/pagina'), true);
    assert.equal(Materiais.ehUrlValida('http://site.com'), true);
    assert.equal(Materiais.ehUrlValida('site.com'), false);
    assert.equal(Materiais.ehUrlValida('javascript:alert(1)'), false);
    assert.equal(Materiais.ehUrlValida('https://localhost'), false);
});

test('validarMaterial aceita dados corretos', () => {
    assert.equal(Materiais.validarMaterial(dadosValidos(), base()).ok, true);
});

test('validarMaterial acusa campos obrigatórios vazios', () => {
    const { ok, erros } = Materiais.validarMaterial(dadosValidos({ titulo: ' ', resumo: '', links: [''] }), base());
    assert.equal(ok, false);
    assert.ok(erros.titulo && erros.resumo && erros['link-0']);
});

test('validarMaterial acusa link inválido na linha correta', () => {
    const { erros } = Materiais.validarMaterial(dadosValidos({ links: ['https://ok.com', 'nao-e-link'] }), base());
    assert.equal(erros['link-0'], undefined);
    assert.ok(erros['link-1']);
});

test('validarMaterial bloqueia título repetido na mesma disciplina, exceto no próprio item', () => {
    const existentes = base();
    const repetido = dadosValidos({ titulo: 'lógica proposicional', disciplina: 'Computabilidade' });
    assert.ok(Materiais.validarMaterial(repetido, existentes).erros.titulo);
    assert.equal(Materiais.validarMaterial(repetido, existentes, 'exemplo-1').erros.titulo, undefined);
    // mesma palavra em outra disciplina é permitida
    assert.equal(Materiais.validarMaterial({ ...repetido, disciplina: 'Filosofia' }, existentes).ok, true);
});

test('criarMaterial gera id, data, avaliação zerada e etapas iniciais', () => {
    const material = Materiais.criarMaterial({ ...dadosValidos(), links: [' https://a.com ', 'https://a.com', ''] });
    assert.ok(material.id);
    assert.deepEqual(material.links, ['https://a.com']);
    assert.equal(material.avaliacao, 0);
    assert.equal(material.etapas.length, 2);
    assert.match(material.criadoEm, /^\d{4}-\d{2}-\d{2}$/);
});

test('aplicarEdicao altera os campos e preserva etapas, anotações e conceitos', () => {
    const original = base()[1];
    const { etapas, anotacoes, conceitos } = original;
    Materiais.aplicarEdicao(original, dadosValidos({ titulo: 'Novo título' }));
    assert.equal(original.titulo, 'Novo título');
    assert.equal(original.etapas, etapas);
    assert.equal(original.anotacoes, anotacoes);
    assert.equal(original.conceitos, conceitos);
});

test('filtrar pesquisa por palavras, sem diferenciar acentos', () => {
    const consulta = (extras) => ({ busca: '', disciplina: '', status: '', tipo: '', dificuldade: '', ...extras });
    const titulos = (extras) => Materiais.filtrar(base(), consulta(extras)).map((m) => m.titulo);

    assert.deepEqual(titulos({ busca: 'LOGICA' }), ['Lógica Proposicional']);
    assert.deepEqual(titulos({ busca: 'platao' }), ['Experiência do Pensar Filosófico']);
    assert.deepEqual(titulos({ busca: 'proposicao' }), ['Lógica Proposicional']); // conceito salvo
    assert.deepEqual(titulos({ busca: 'flexbox' }), ['HTML e CSS']); // anotação
    assert.equal(titulos({ busca: 'palavra inexistente' }).length, 0);
});

test('filtrar combina pesquisa e filtros por disciplina, status, tipo e dificuldade', () => {
    const consulta = (extras) => ({ busca: '', disciplina: '', status: '', tipo: '', dificuldade: '', ...extras });
    const total = (extras) => Materiais.filtrar(base(), consulta(extras)).length;

    assert.equal(total({ status: 'concluido' }), 1);
    assert.equal(total({ tipo: 'video', dificuldade: 'dificil' }), 0);
    assert.equal(total({ disciplina: 'Filosofia', status: 'em-andamento' }), 1);
    assert.equal(total({ busca: 'css', tipo: 'video' }), 1);
});

test('ordenar não altera a lista original e respeita cada critério', () => {
    const lista = base();
    const copia = lista.map((m) => m.titulo);
    const ordem = (criterio) => Materiais.ordenar(lista, criterio).map((m) => m.titulo);

    assert.deepEqual(lista.map((m) => m.titulo), copia);
    assert.deepEqual(ordem('data-desc'), ['Lógica Proposicional', 'HTML e CSS', 'Experiência do Pensar Filosófico']);
    assert.deepEqual(ordem('data-asc'), ['Experiência do Pensar Filosófico', 'HTML e CSS', 'Lógica Proposicional']);
    assert.deepEqual(ordem('titulo-asc'), ['Experiência do Pensar Filosófico', 'HTML e CSS', 'Lógica Proposicional']);
    assert.deepEqual(ordem('titulo-desc'), ['Lógica Proposicional', 'HTML e CSS', 'Experiência do Pensar Filosófico']);

    lista[2].avaliacao = 2;
    assert.equal(ordem('avaliacao-desc')[2], 'Experiência do Pensar Filosófico');
});

test('reconstruirMaterial descarta registros inválidos e completa campos ausentes', () => {
    assert.equal(Materiais.reconstruirMaterial(null), null);
    assert.equal(Materiais.reconstruirMaterial({ id: 'x' }), null);
    const material = Materiais.reconstruirMaterial({ id: 'x', titulo: ' T ', avaliacao: 9, tipo: 'zzz' });
    assert.equal(material.titulo, 'T');
    assert.equal(material.avaliacao, 0);
    assert.equal(material.tipo, 'artigo');
    assert.deepEqual(material.etapas, []);
});

test('Wikipedia.interpretar ordena por relevância e descarta links estranhos', () => {
    const resposta = { query: { pages: {
        9: { title: 'Segundo', index: 2, extract: 'Texto   com\n quebras.', fullurl: 'https://pt.wikipedia.org/wiki/Segundo' },
        7: { title: 'Primeiro', index: 1, extract: 'Resumo.', fullurl: 'https://pt.wikipedia.org/wiki/Primeiro' },
        3: { title: 'Perigoso', index: 3, extract: 'x', fullurl: 'javascript:alert(1)' },
    } } };
    const conceitos = Wikipedia.interpretar(resposta);
    assert.deepEqual(conceitos.map((c) => c.titulo), ['Primeiro', 'Segundo']);
    assert.equal(conceitos[1].resumo, 'Texto com quebras.');
    assert.deepEqual(Wikipedia.interpretar({ batchcomplete: '' }), []);
    assert.deepEqual(Wikipedia.interpretar(null), []);
});
