/* StartCore — script principal */
(() => {
    'use strict';

    const $ = (seletor, raiz = document) => raiz.querySelector(seletor);

    /** Cria um elemento: atributos comuns viram atributos HTML; "texto" usa textContent. */
    function el(tag, atributos = {}, ...filhos) {
        const elemento = document.createElement(tag);
        Object.entries(atributos).forEach(([nome, valor]) => {
            if (valor === undefined || valor === null || valor === false) return;
            if (nome === 'texto') elemento.textContent = valor;
            else if (nome === 'classe') elemento.className = valor;
            else if (nome === 'dados') Object.assign(elemento.dataset, valor);
            else elemento.setAttribute(nome, valor === true ? '' : valor);
        });
        filhos.flat().forEach((filho) => {
            if (filho !== null && filho !== undefined && filho !== false) elemento.append(filho);
        });
        return elemento;
    }

    /** "2026-03-15" -> "15/03/2026" (sem converter fuso horário). */
    function formatarData(iso) {
        const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
        return `${dia}/${mes}/${ano}`;
    }

    const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

    /* ------------------------------------------------------------ estado --- */

    /** Dados mantidos pela aplicação; a interface é sempre desenhada a partir daqui. */
    /** Pesquisa e filtros sem nenhuma restrição. */
    function consultaVazia() {
        return { busca: '', disciplina: '', status: '', tipo: '', dificuldade: '' };
    }

    const estado = {
        materiais: [],
        anexosFormulario: [], // anexos escolhidos no formulário aberto
        detalheId: null,      // material aberto na tela de detalhes
        editandoId: null,     // material em edição no formulário (null = novo cadastro)
        conceitoPendente: null, // conceito da Wikipédia que originou o cadastro aberto
        consulta: consultaVazia(), // pesquisa e filtros aplicados à listagem
        ordem: 'data-desc',        // ordenação escolhida
    };

    /** Grava o estado no localStorage. Devolve false se o navegador recusar. */
    function persistir() {
        return Armazenamento.salvarMateriais(estado.materiais);
    }

    /** Recupera os materiais salvos (ou os exemplos, na primeira visita). */
    function carregarDados() {
        const { itens, origem } = Armazenamento.carregarMateriais();
        estado.materiais = itens;
        if (origem !== 'salvo') persistir();
    }

    /* -------------------------------------------------------- mensagens --- */

    /**
     * Mostra um aviso temporário. tipo: "sucesso", "erro" ou "aviso".
     * acao (opcional): { texto, aoClicar }, usada, por exemplo, para desfazer.
     */
    function mostrarMensagem(texto, tipo = 'sucesso', acao = null) {
        const caixa = el('div', { classe: `mensagem mensagem-${tipo}` }, el('span', { texto }));
        if (acao) {
            caixa.append(el('button', { type: 'button', texto: acao.texto }));
            $('button', caixa).addEventListener('click', () => {
                acao.aoClicar();
                caixa.remove();
            });
        }
        $('#toasts').append(caixa);
        setTimeout(() => caixa.remove(), acao ? 7000 : 4500);
    }

    /** Aviso padrão quando o localStorage recusa a gravação. */
    function avisarFalhaAoSalvar() {
        mostrarMensagem('Não foi possível salvar no navegador (armazenamento cheio ou bloqueado). A alteração vale só até recarregar a página.', 'erro');
    }

    /* -------------------------------------------------------- listagem --- */

    /** Monta o card de um material. */
    function criarCard(material) {
        const estrelas = '★'.repeat(material.avaliacao) + '☆'.repeat(5 - material.avaliacao);
        const descricaoNota = material.avaliacao
            ? `Avaliação: ${material.avaliacao} de 5 estrelas`
            : 'Sem avaliação';

        return el('article', { classe: 'card', dados: { id: material.id } },
            el('div', { classe: 'headercard' },
                el('span', { classe: 'disciplina', texto: Materiais.rotuloDe(Materiais.DISCIPLINAS, material.disciplina, 'curto') }),
                el('span', { classe: `status status-${material.status}`, texto: Materiais.rotuloDe(Materiais.STATUS, material.status) })
            ),
            el('div', { classe: 'maincard' },
                el('h3', { texto: material.titulo }),
                el('p', { texto: material.resumo }),
                el('ul', { classe: 'infocards' },
                    el('li', { texto: Materiais.rotuloDe(Materiais.TIPOS, material.tipo) }),
                    el('li', { texto: Materiais.rotuloDe(Materiais.DIFICULDADES, material.dificuldade) }),
                    el('li', {}, el('time', { datetime: material.criadoEm.slice(0, 10), texto: formatarData(material.criadoEm) })),
                    el('li', { texto: plural(material.links.length, 'link', 'links') }),
                    el('li', { texto: plural(material.anexos.length, 'arquivo', 'arquivos') })
                )
            ),
            el('div', { classe: 'footercard' },
                el('div', { classe: 'avaliacao', role: 'img', 'aria-label': descricaoNota },
                    el('span', { 'aria-hidden': 'true', texto: estrelas })
                ),
                el('div', { classe: 'alterar' },
                    el('button', { type: 'button', dados: { acao: 'detalhes' }, texto: 'Ver/Editar' }),
                    el('button', { type: 'button', dados: { acao: 'excluir' } },
                        el('span', { 'aria-hidden': 'true', texto: '🗑️' }), ' Excluir')
                )
            )
        );
    }

    /** Estado vazio da listagem, com um botão de ação opcional. */
    function criarVazio(mensagem, textoBotao = null, aoClicar = null) {
        const vazio = el('div', { classe: 'vazio' }, el('p', { texto: mensagem }));
        if (textoBotao) {
            const botao = el('button', { type: 'button', texto: textoBotao });
            botao.addEventListener('click', aoClicar);
            vazio.append(botao);
        }
        return vazio;
    }

    /** Há alguma pesquisa ou filtro aplicado? */
    const consultaAtiva = () => Object.values(estado.consulta).some((valor) => valor.trim() !== '');

    function desenharLista() {
        const todos = estado.materiais;
        const visiveis = Materiais.ordenar(Materiais.filtrar(todos, estado.consulta), estado.ordem);
        const container = $('#lista-materiais');

        $('#total-materiais').textContent = consultaAtiva() ? `${visiveis.length} de ${todos.length}` : todos.length;
        $('#status-lista').textContent = plural(visiveis.length, 'material encontrado', 'materiais encontrados');
        $('#limpar-filtros').hidden = !consultaAtiva();

        if (todos.length === 0) {
            container.replaceChildren(criarVazio('Nenhum material cadastrado ainda.', 'Cadastrar o primeiro material', () => abrirFormulario()));
        } else if (visiveis.length === 0) {
            container.replaceChildren(criarVazio('Nenhum material encontrado para a pesquisa e os filtros aplicados.', 'Limpar pesquisa e filtros', limparConsulta));
        } else {
            container.replaceChildren(...visiveis.map(criarCard));
        }
    }

    /** Progresso do período (cabeçalho e painel lateral) e atalhos do rodapé. */
    function desenharResumo() {
        const { total, concluidos, pendentes, percentual } = Materiais.calcularProgresso(estado.materiais);

        $('#header-percentual').textContent = `${percentual}% concluído`;
        $('#header-contagem').textContent = `${concluidos}/${total}`;
        $('.progressoH').style.setProperty('--progresso', percentual);

        $('#roda-percentual').textContent = `${percentual}%`;
        $('.roda').style.setProperty('--progresso', percentual);
        $('#contagem-concluidos').textContent = plural(concluidos, 'Concluído', 'Concluídos');
        $('#contagem-pendentes').textContent = plural(pendentes, 'Pendente', 'Pendentes');

        const ultimo = estado.materiais.find((item) => item.id === Armazenamento.lerUltimoAcesso());
        $('#ultimo-acessado').textContent = ultimo ? ultimo.titulo : '—';

        const notas = estado.materiais.reduce((soma, item) => soma + item.anotacoes.length, 0);
        $('#total-notas').textContent = `${plural(notas, 'nota registrada', 'notas registradas')} nos materiais`;
    }

    /** Redesenha tudo o que depende dos materiais. */
    function desenharTudo() {
        desenharLista();
        desenharResumo();
        desenharConceitos();
    }

    /* -------------------------------------------------------- pesquisa --- */

    const FILTROS = {
        disciplina: '#filtrodisciplina',
        status: '#filtrostatus',
        tipo: '#filtrotipo',
        dificuldade: '#filtrodificuldade',
    };

    /** Remove pesquisa e filtros e mostra a lista completa. */
    function limparConsulta() {
        estado.consulta = consultaVazia();
        $('#input-search').value = '';
        Object.values(FILTROS).forEach((seletor) => { $(seletor).value = ''; });
        desenharLista();
    }

    /** Garante que um material recém-criado ou restaurado apareça na lista. */
    function mostrarNaLista(material) {
        if (Materiais.filtrar([material], estado.consulta).length === 0) limparConsulta();
    }

    function iniciarPesquisa() {
        // Opções dos filtros geradas a partir das mesmas listas do formulário.
        const acrescentar = (seletor, lista, campo = 'rotulo') =>
            $(seletor).append(...lista.map((item) => el('option', { value: item.valor, texto: item[campo] })));
        acrescentar(FILTROS.disciplina, Materiais.DISCIPLINAS, 'curto');
        acrescentar(FILTROS.status, Materiais.STATUS);
        acrescentar(FILTROS.tipo, Materiais.TIPOS);
        acrescentar(FILTROS.dificuldade, Materiais.DIFICULDADES);

        $('#form-pesquisa').addEventListener('submit', (evento) => evento.preventDefault());
        $('#input-search').addEventListener('input', (evento) => {
            estado.consulta.busca = evento.target.value;
            desenharLista();
        });
        Object.entries(FILTROS).forEach(([campo, seletor]) => {
            $(seletor).addEventListener('change', (evento) => {
                estado.consulta[campo] = evento.target.value;
                desenharLista();
            });
        });
        $('#limpar-filtros').addEventListener('click', limparConsulta);

        // Ordenação: lembra a última escolha.
        const seletorOrdem = $('#ordenar');
        seletorOrdem.replaceChildren(...Materiais.ORDENACOES.map((opcao) =>
            el('option', { value: opcao.valor, texto: `Ordenar por: ${opcao.rotulo}` })));
        const salva = Armazenamento.lerOrdem();
        if (Materiais.valores(Materiais.ORDENACOES).includes(salva)) estado.ordem = salva;
        seletorOrdem.value = estado.ordem;
        seletorOrdem.addEventListener('change', (evento) => {
            estado.ordem = evento.target.value;
            Armazenamento.gravarOrdem(estado.ordem);
            desenharLista();
        });
    }

    /* -------------------------------------------------------- cadastro --- */

    const dialogoCadastro = $('.cadastrodenovomaterial');
    const formulario = $('#formcad');
    const CAMPOS = {
        titulo: '#formtitulo',
        disciplina: '#formdisciplina',
        tipo: '#formtipo',
        dificuldade: '#formdificuldade',
        status: '#formstatus',
        resumo: '#resumocad',
    };

    /** Preenche um <select> com as opções de uma lista. */
    function preencherSelect(select, lista, campoRotulo = 'rotulo') {
        select.replaceChildren(...lista.map((item) =>
            el('option', { value: item.valor, texto: item[campoRotulo] })));
    }

    function prepararOpcoesDoFormulario() {
        preencherSelect($('#formdisciplina'), Materiais.DISCIPLINAS, 'curto');
        preencherSelect($('#formtipo'), Materiais.TIPOS);
        preencherSelect($('#formdificuldade'), Materiais.DIFICULDADES);
        preencherSelect($('#formstatus'), Materiais.STATUS);
    }

    /* ---- links ---- */

    const camposDeLink = () => [...document.querySelectorAll('#lista-links input')];

    function adicionarLinha(valor = '') {
        if (camposDeLink().length >= Materiais.LIMITES.linksMax) {
            mostrarMensagem(`Use no máximo ${Materiais.LIMITES.linksMax} links por material.`, 'aviso');
            return;
        }
        const campo = el('input', { type: 'url', name: 'link', placeholder: 'https://...', 'aria-label': `Link ${camposDeLink().length + 1}` });
        campo.value = valor;
        const linha = el('div', { classe: 'linha-link' }, campo,
            el('button', { type: 'button', classe: 'remover', 'aria-label': 'Remover este link', texto: '✕' }));
        $('#lista-links').append(linha);
        campo.focus();
    }

    function definirLinks(links) {
        const lista = $('#lista-links');
        const primeira = $('.linha-link', lista);
        lista.replaceChildren(primeira);
        $('input', primeira).value = links[0] ?? '';
        links.slice(1).forEach((link) => adicionarLinha(link));
    }

    /* ---- anexos ---- */

    function formatarTamanho(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function desenharAnexosDoFormulario() {
        $('#lista-anexos').replaceChildren(...estado.anexosFormulario.map((anexo, indice) =>
            el('li', {},
                el('span', { texto: `${anexo.nome} (${formatarTamanho(anexo.tamanho)})` }),
                el('button', { type: 'button', dados: { removerAnexo: indice }, 'aria-label': `Remover ${anexo.nome}`, texto: '✕' }))));
    }

    function acrescentarAnexos(arquivos) {
        [...arquivos].forEach((arquivo) => {
            const repetido = estado.anexosFormulario.some((item) => item.nome === arquivo.name && item.tamanho === arquivo.size);
            if (!repetido) estado.anexosFormulario.push({ nome: arquivo.name, tamanho: arquivo.size });
        });
        desenharAnexosDoFormulario();
    }

    /* ---- erros de validação ---- */

    function limparErros() {
        formulario.querySelectorAll('.erro-campo').forEach((aviso) => aviso.remove());
        formulario.querySelectorAll('[aria-invalid]').forEach((campo) => {
            campo.removeAttribute('aria-invalid');
            campo.removeAttribute('aria-describedby');
        });
    }

    function campoDoErro(chave) {
        if (chave.startsWith('link-')) return camposDeLink()[Number(chave.slice(5))];
        return $(CAMPOS[chave]);
    }

    /** Mostra cada mensagem junto do campo e leva o foco ao primeiro problema. */
    function mostrarErros(erros) {
        limparErros();
        let primeiro = null;
        Object.entries(erros).forEach(([chave, mensagem]) => {
            const campo = campoDoErro(chave);
            if (!campo) return;
            const id = `erro-${chave}`;
            const aviso = el('p', { classe: 'erro-campo', id, role: 'alert', texto: mensagem });
            (campo.closest('.linha-link') || campo).insertAdjacentElement('afterend', aviso);
            campo.setAttribute('aria-invalid', 'true');
            campo.setAttribute('aria-describedby', id);
            primeiro ??= campo;
        });
        if (primeiro) primeiro.focus();
    }

    /* ---- abrir, fechar e enviar ---- */

    function lerFormulario() {
        return {
            titulo: $('#formtitulo').value,
            disciplina: $('#formdisciplina').value,
            tipo: $('#formtipo').value,
            dificuldade: $('#formdificuldade').value,
            status: $('#formstatus').value,
            links: camposDeLink().map((campo) => campo.value),
            anexos: estado.anexosFormulario.map((anexo) => ({ ...anexo })),
            resumo: $('#resumocad').value,
        };
    }

    /** Garante que o <select> tenha a opção (valores antigos continuam editáveis). */
    function selecionar(select, valor) {
        if (![...select.options].some((opcao) => opcao.value === valor)) {
            select.append(el('option', { value: valor, texto: valor }));
        }
        select.value = valor;
    }

    /** Abre o formulário vazio (novo cadastro) ou preenchido com o material a editar. */
    function abrirFormulario(material = null, conceito = null) {
        formulario.reset();
        limparErros();
        estado.editandoId = material ? material.id : null;
        estado.conceitoPendente = conceito;
        $('#aviso-wikipedia').hidden = !conceito;
        $('#titulo-cadastro').textContent = material ? 'Editar Material de Estudo' : 'Cadastrar Material de Estudo';
        $('.salvar').textContent = material ? 'Salvar Alterações' : 'Salvar Material';

        definirLinks(material ? material.links : []);
        estado.anexosFormulario = material ? material.anexos.map((anexo) => ({ ...anexo })) : [];
        desenharAnexosDoFormulario();

        if (material) {
            $('#formtitulo').value = material.titulo;
            selecionar($('#formdisciplina'), material.disciplina);
            $('#formtipo').value = material.tipo;
            $('#formdificuldade').value = material.dificuldade;
            $('#formstatus').value = material.status;
            $('#resumocad').value = material.resumo;
        }

        if (conceito) {
            // Cadastro iniciado por um conceito da Wikipédia: já vem preenchido.
            $('#formtitulo').value = conceito.titulo.slice(0, Materiais.LIMITES.tituloMax);
            $('#resumocad').value = conceito.resumo;
            $('#formtipo').value = 'artigo';
            definirLinks([conceito.url]);
        }

        dialogoCadastro.showModal();
        $('#formtitulo').focus();
    }

    function fecharFormulario() {
        dialogoCadastro.close();
    }

    function destacarCard(id) {
        const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('destaque');
        card.addEventListener('animationend', () => card.classList.remove('destaque'), { once: true });
    }

    function aoEnviarFormulario(evento) {
        evento.preventDefault();
        const dados = lerFormulario();
        const { ok, erros } = Materiais.validarMaterial(dados, estado.materiais, estado.editandoId);

        if (!ok) {
            mostrarErros(erros);
            mostrarMensagem('Corrija os campos destacados para continuar.', 'aviso');
            return;
        }

        if (estado.editandoId) {
            const id = estado.editandoId;
            fecharFormulario();
            atualizarMaterial(id, (material) => Materiais.aplicarEdicao(material, dados), (material) => {
                desenharDetalhes(material);
                document.title = `${material.titulo} — StartCore`;
            }, 'Alterações salvas com sucesso.');
            return;
        }

        const novo = Materiais.criarMaterial({ ...dados, conceitos: estado.conceitoPendente ? [estado.conceitoPendente] : [] });
        estado.materiais.unshift(novo);
        const salvou = persistir();

        fecharFormulario();
        mostrarNaLista(novo);
        desenharTudo();
        destacarCard(novo.id);
        if (salvou) mostrarMensagem(`Material "${novo.titulo}" cadastrado com sucesso.`);
        else avisarFalhaAoSalvar();
    }

    function iniciarCadastro() {
        prepararOpcoesDoFormulario();

        $('#novomaterial').addEventListener('click', () => abrirFormulario());
        $('.sair').addEventListener('click', fecharFormulario);
        $('.cancelar').addEventListener('click', fecharFormulario);
        $('#add-link').addEventListener('click', () => adicionarLinha());
        $('#anexo').addEventListener('change', (evento) => {
            acrescentarAnexos(evento.target.files);
            evento.target.value = '';
        });
        formulario.addEventListener('submit', aoEnviarFormulario);

        // Remover um link ou um anexo (delegação de eventos).
        formulario.addEventListener('click', (evento) => {
            const botao = evento.target.closest('button');
            if (!botao) return;
            if (botao.classList.contains('remover')) botao.closest('.linha-link').remove();
            if (botao.dataset.removerAnexo !== undefined) {
                estado.anexosFormulario.splice(Number(botao.dataset.removerAnexo), 1);
                desenharAnexosDoFormulario();
            }
        });

        // O erro de um campo some assim que a pessoa começa a corrigi-lo.
        formulario.addEventListener('input', (evento) => {
            const campo = evento.target;
            if (campo.getAttribute('aria-invalid') !== 'true') return;
            campo.removeAttribute('aria-invalid');
            const aviso = document.getElementById(campo.getAttribute('aria-describedby'));
            if (aviso) aviso.remove();
        });

        // Clique fora da janela (no fundo escurecido) fecha o formulário.
        dialogoCadastro.addEventListener('click', (evento) => {
            if (evento.target !== dialogoCadastro) return;
            const caixa = dialogoCadastro.getBoundingClientRect();
            const fora = evento.clientX < caixa.left || evento.clientX > caixa.right
                || evento.clientY < caixa.top || evento.clientY > caixa.bottom;
            if (fora) fecharFormulario();
        });
    }

    /* ------------------------------------------------------- detalhes --- */

    const telaDetalhes = $('#teladois');
    const PREFIXO_ROTA = '#material-';

    const buscarMaterial = (id) => estado.materiais.find((item) => item.id === id);

    /** Texto curto para um link: domínio e último trecho do caminho. */
    function nomeDoSite(url) {
        try {
            const { hostname, pathname } = new URL(url);
            const trechos = pathname.split('/').filter(Boolean).map(decodeURIComponent);
            const site = hostname.replace(/^www\./, '');
            if (trechos.length === 0) return site;
            const ultimo = trechos[trechos.length - 1].slice(0, 30);
            return trechos.length === 1 ? `${site}/${ultimo}` : `${site}/…/${ultimo}`;
        } catch (erro) {
            return url;
        }
    }

    function linkExterno(url, texto, classe) {
        return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', title: url, classe, texto });
    }

    function desenharStatus(material, focar = null) {
        const botoes = Materiais.STATUS.map((opcao) =>
            el('button', {
                type: 'button',
                classe: `status2${opcao.valor === material.status ? ' ativo' : ''}`,
                'aria-pressed': String(opcao.valor === material.status),
                dados: { status: opcao.valor },
                texto: opcao.rotulo,
            }));
        $('#detalhe-status').replaceChildren(...botoes);
        if (focar) botoes.find((botao) => botao.dataset.status === focar)?.focus();
    }

    function desenharEtapas(material) {
        $('#detalhe-etapas').replaceChildren(...material.etapas.map((etapa, indice) =>
            el('li', {},
                el('input', { type: 'checkbox', checked: etapa.feita, dados: { etapa: indice }, id: `etapa-${indice}` }),
                el('label', { for: `etapa-${indice}`, texto: etapa.texto }),
                el('button', { type: 'button', classe: 'remover', dados: { removerEtapa: indice }, 'aria-label': `Remover a etapa ${etapa.texto}`, texto: '✕' }))));
        if (material.etapas.length === 0) {
            $('#detalhe-etapas').append(el('li', { classe: 'dica', texto: 'Nenhuma etapa cadastrada.' }));
        }
    }

    function desenharAnotacoes(material) {
        const itens = material.anotacoes.map((nota, indice) => ({ nota, indice })).reverse();
        $('#detalhe-anotacoes').replaceChildren(...(itens.length
            ? itens.map(({ nota, indice }) => {
                const quando = new Date(nota.em);
                const data = `${quando.toLocaleDateString('pt-BR')} às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                return el('div', { classe: 'note-entry' },
                    el('p', { classe: 'note-timestamp', texto: data }),
                    el('p', { texto: nota.texto }),
                    el('button', { type: 'button', classe: 'remover', dados: { removerAnotacao: indice }, 'aria-label': `Excluir a anotação de ${data}`, texto: 'Excluir' }));
            })
            : [el('p', { classe: 'dica', texto: 'Nenhuma anotação registrada ainda.' })]));
    }

    function desenharEstrelas(material, focar = null) {
        const botoes = [1, 2, 3, 4, 5].map((nota) =>
            el('button', {
                type: 'button',
                dados: { estrela: nota },
                'aria-pressed': String(nota <= material.avaliacao),
                'aria-label': `${nota} ${nota === 1 ? 'estrela' : 'estrelas'}`,
                texto: nota <= material.avaliacao ? '★' : '☆',
            }));
        $('#detalhe-estrelas').replaceChildren(...botoes);
        if (focar) botoes[focar - 1].focus();
    }

    function desenharDetalhes(material) {
        $('#detalhe-chips').replaceChildren(
            el('span', { classe: 'list', texto: material.disciplina }),
            el('span', { classe: 'list', texto: Materiais.rotuloDe(Materiais.TIPOS, material.tipo) }),
            el('span', { classe: 'list', texto: Materiais.rotuloDe(Materiais.DIFICULDADES, material.dificuldade) })
        );
        $('#titulo-detalhe').textContent = material.titulo;
        desenharStatus(material);

        $('#detalhe-links').replaceChildren(...material.links.map((url) => linkExterno(url, nomeDoSite(url), 'tipot2')));
        const principal = $('#detalhe-link-principal');
        principal.hidden = material.links.length === 0;
        principal.href = material.links[0] ?? '#';

        desenharEtapas(material);
        desenharAnotacoes(material);
        $('#detalhe-resumo').textContent = material.resumo;
        desenharEstrelas(material);
        desenharConceitosDoMaterial(material);

        $('#detalhe-meta').replaceChildren(
            el('li', {}, el('strong', { texto: 'Data de Cadastro:' }), ' ', el('time', { datetime: material.criadoEm.slice(0, 10), texto: formatarData(material.criadoEm) })),
            el('li', {}, el('strong', { texto: 'Link Principal:' }), ' ',
                material.links[0] ? linkExterno(material.links[0], 'Acessar Recurso') : 'Não informado'),
            el('li', {}, el('strong', { texto: 'Anexos:' }), ' ',
                material.anexos.length
                    ? material.anexos.map((anexo) => `${anexo.nome} (${formatarTamanho(anexo.tamanho)})`).join(', ')
                    : 'Nenhum arquivo')
        );
    }

    /**
     * Aplica uma alteração a um material, grava no localStorage e atualiza a tela.
     * aoRedesenhar: função que atualiza apenas a parte dos detalhes que mudou.
     */
    function atualizarMaterial(id, alterar, aoRedesenhar = null, aviso = null) {
        const material = buscarMaterial(id);
        if (!material) return;
        alterar(material);
        const salvou = persistir();
        desenharTudo();
        if (aoRedesenhar && estado.detalheId === id) aoRedesenhar(material);
        if (!salvou) avisarFalhaAoSalvar();
        else if (aviso) mostrarMensagem(aviso);
    }

    /** Mostra uma mensagem de erro logo abaixo de um campo (some ao digitar). */
    function erroNoCampo(campo, texto) {
        campo.parentElement.querySelectorAll('.erro-campo').forEach((aviso) => aviso.remove());
        const aviso = el('p', { classe: 'erro-campo', id: `erro-${campo.id}`, role: 'alert', texto });
        campo.insertAdjacentElement('afterend', aviso);
        campo.setAttribute('aria-invalid', 'true');
        campo.setAttribute('aria-describedby', aviso.id);
        campo.focus();
        campo.addEventListener('input', () => {
            aviso.remove();
            campo.removeAttribute('aria-invalid');
            campo.removeAttribute('aria-describedby');
        }, { once: true });
    }

    function adicionarEtapa(evento) {
        evento.preventDefault();
        const campo = $('#nova-etapa');
        const texto = campo.value.trim();
        const material = buscarMaterial(estado.detalheId);
        if (texto.length < 2) return erroNoCampo(campo, 'Escreva o nome da etapa (mínimo de 2 caracteres).');
        if (material.etapas.some((etapa) => Materiais.normalizarTexto(etapa.texto) === Materiais.normalizarTexto(texto))) {
            return erroNoCampo(campo, 'Esta etapa já existe no checklist.');
        }
        campo.value = '';
        atualizarMaterial(material.id, (item) => item.etapas.push({ texto, feita: false }), desenharEtapas);
        campo.focus();
    }

    function salvarAnotacao() {
        const campo = $('#nova-anotacao');
        const texto = campo.value.trim();
        if (texto.length < 3) return erroNoCampo(campo, 'Escreva ao menos 3 caracteres para salvar a anotação.');
        campo.value = '';
        atualizarMaterial(estado.detalheId, (item) => item.anotacoes.push({ texto, em: Materiais.agora() }),
            desenharAnotacoes, 'Anotação salva com data e hora.');
    }

    /** Ações da tela de detalhes (delegação de eventos). */
    function aoClicarNosDetalhes(evento) {
        const botao = evento.target.closest('button');
        if (!botao) return;
        const id = estado.detalheId;
        const { status, estrela, removerEtapa, removerAnotacao } = botao.dataset;

        if (status) {
            atualizarMaterial(id, (item) => { item.status = status; },
                (item) => desenharStatus(item, status),
                `Status alterado para "${Materiais.rotuloDe(Materiais.STATUS, status)}".`);
        } else if (estrela) {
            const nota = Number(estrela);
            atualizarMaterial(id, (item) => { item.avaliacao = item.avaliacao === nota ? 0 : nota; },
                (item) => desenharEstrelas(item, nota));
        } else if (removerEtapa !== undefined) {
            atualizarMaterial(id, (item) => item.etapas.splice(Number(removerEtapa), 1), desenharEtapas);
            $('#nova-etapa').focus();
        } else if (removerAnotacao !== undefined) {
            atualizarMaterial(id, (item) => item.anotacoes.splice(Number(removerAnotacao), 1),
                desenharAnotacoes, 'Anotação excluída.');
            $('#nova-anotacao').focus();
        }
    }

    function mostrarDetalhes(id) {
        const material = buscarMaterial(id);
        if (!material) {
            mostrarMensagem('Material não encontrado. Ele pode ter sido excluído.', 'aviso');
            history.replaceState(null, '', location.pathname + location.search);
            mostrarPainel();
            return;
        }
        if (estado.detalheId !== id) {
            buscaDetalhe.limpar();
            $('#termo-conceito-detalhe').value = '';
        }
        estado.detalheId = id;
        Armazenamento.gravarUltimoAcesso(id);
        desenharDetalhes(material);
        desenharResumo();
        telaDetalhes.classList.add('ativa');
        document.title = `${material.titulo} — StartCore`;
        window.scrollTo(0, 0);
        $('#titulo-detalhe').focus({ preventScroll: true });
    }

    function mostrarPainel() {
        estado.detalheId = null;
        telaDetalhes.classList.remove('ativa');
        document.title = 'StartCore';
    }

    /** Lê o endereço (#material-<id>) e mostra a tela correspondente. */
    function aoMudarRota() {
        if (location.hash.startsWith(PREFIXO_ROTA)) mostrarDetalhes(decodeURIComponent(location.hash.slice(PREFIXO_ROTA.length)));
        else mostrarPainel();
    }

    /** Abre os detalhes de um material, criando uma entrada no histórico do navegador. */
    function abrirDetalhes(id) {
        history.pushState(null, '', PREFIXO_ROTA + encodeURIComponent(id));
        aoMudarRota();
    }

    function voltarAoPainel() {
        history.pushState(null, '', location.pathname + location.search);
        mostrarPainel();
        window.scrollTo(0, 0);
    }

    function iniciarDetalhes() {
        $('#lista-materiais').addEventListener('click', (evento) => {
            const botao = evento.target.closest('button[data-acao="detalhes"]');
            if (!botao) return;
            abrirDetalhes(botao.closest('.card').dataset.id);
        });
        $('.voltar').addEventListener('click', voltarAoPainel);
        telaDetalhes.addEventListener('click', aoClicarNosDetalhes);
        telaDetalhes.addEventListener('change', (evento) => {
            const caixa = evento.target.closest('input[data-etapa]');
            if (!caixa) return;
            atualizarMaterial(estado.detalheId, (item) => { item.etapas[Number(caixa.dataset.etapa)].feita = caixa.checked; });
        });
        $('#form-etapa').addEventListener('submit', adicionarEtapa);
        $('#editar-material').addEventListener('click', () => abrirFormulario(buscarMaterial(estado.detalheId)));
        $('#salvar-anotacao').addEventListener('click', salvarAnotacao);
        window.addEventListener('popstate', aoMudarRota); // botões voltar/avançar e alteração manual do endereço
        aoMudarRota(); // abre direto no detalhe quando o endereço já traz #material-<id>
    }

    /* -------------------------------------------------------- exclusão --- */

    const dialogoExclusao = $('#confirmar-exclusao');
    let idParaExcluir = null;

    /** Abre a confirmação antes de remover um material. */
    function pedirExclusao(id) {
        const material = buscarMaterial(id);
        if (!material) return;
        idParaExcluir = id;
        $('#confirmar-texto').textContent = `Tem certeza de que deseja excluir "${material.titulo}"? As etapas, anotações e conceitos deste material também serão removidos.`;
        dialogoExclusao.showModal();
        $('#cancelar-exclusao').focus();
    }

    /** Devolve um material excluído à posição em que estava. */
    function desfazerExclusao(material, indice) {
        if (buscarMaterial(material.id)) return;
        estado.materiais.splice(Math.min(indice, estado.materiais.length), 0, material);
        if (!persistir()) avisarFalhaAoSalvar();
        mostrarNaLista(material);
        desenharTudo();
        destacarCard(material.id);
        mostrarMensagem(`Material "${material.titulo}" restaurado.`);
    }

    function excluirMaterial(id) {
        const indice = estado.materiais.findIndex((item) => item.id === id);
        if (indice === -1) return;
        const [removido] = estado.materiais.splice(indice, 1);
        const salvou = persistir();

        if (estado.detalheId === id) voltarAoPainel();
        desenharTudo();
        $('.guia h2').focus();

        if (!salvou) avisarFalhaAoSalvar();
        else mostrarMensagem(`Material "${removido.titulo}" excluído.`, 'sucesso',
            { texto: 'Desfazer', aoClicar: () => desfazerExclusao(removido, indice) });
    }

    function iniciarExclusao() {
        $('#lista-materiais').addEventListener('click', (evento) => {
            const botao = evento.target.closest('button[data-acao="excluir"]');
            if (botao) pedirExclusao(botao.closest('.card').dataset.id);
        });
        $('#excluir-material').addEventListener('click', () => pedirExclusao(estado.detalheId));
        $('#cancelar-exclusao').addEventListener('click', () => dialogoExclusao.close());
        $('#confirmar-exclusao-botao').addEventListener('click', () => {
            dialogoExclusao.close();
            excluirMaterial(idParaExcluir);
            idParaExcluir = null;
        });
    }

    /* ----------------------------------------- conceitos (API Wikipédia) --- */

    /**
     * Cria um "buscador": guarda o estado de uma busca na Wikipédia (carregando,
     * resultados ou erro) e avisa a tela, por aoMudar, a cada alteração.
     * Uma busca nova cancela a anterior, então só o resultado mais recente vale.
     */
    function criarBuscador(aoMudar, limite = 5) {
        let controle = null;
        const buscador = {
            termo: '',
            resultados: null, // null = nenhuma busca feita
            carregando: false,
            erro: null,

            async buscar(termo) {
                const consulta = termo.trim();
                if (consulta.length < 2) {
                    mostrarMensagem('Digite ao menos 2 letras para buscar na Wikipédia.', 'aviso');
                    return;
                }
                if (controle) controle.abort();
                const meuControle = new AbortController();
                controle = meuControle;

                Object.assign(buscador, { termo: consulta, resultados: null, carregando: true, erro: null });
                aoMudar();
                try {
                    buscador.resultados = await Wikipedia.buscar(consulta, { limite, signal: meuControle.signal });
                } catch (erro) {
                    if (erro.tipo === 'cancelada') return; // outra busca já assumiu a tela
                    buscador.erro = erro;
                }
                buscador.carregando = false;
                aoMudar();
            },

            limpar() {
                if (controle) controle.abort();
                Object.assign(buscador, { termo: '', resultados: null, carregando: false, erro: null });
            },
        };
        return buscador;
    }

    function criarCartaoConceito(conceito, ...acoes) {
        return el('article', { classe: 'concept' },
            el('h3', { texto: conceito.titulo }),
            el('p', { texto: conceito.resumo || 'Sem resumo disponível.' }),
            el('div', { classe: 'acoes-conceito' },
                linkExterno(conceito.url, 'Explorar na Wikipédia >'),
                ...acoes));
    }

    function mensagemErroBusca(erro) {
        if (erro.tipo === 'tempo') return 'A Wikipédia demorou para responder. Tente novamente.';
        if (erro.tipo === 'http') return 'A Wikipédia está indisponível no momento. Tente novamente em instantes.';
        return 'Não foi possível acessar a Wikipédia. Verifique sua conexão e tente novamente.';
    }

    /** Texto de apoio acima dos resultados. */
    function legendaDaBusca(buscador) {
        if (buscador.carregando) return `Buscando "${buscador.termo}" na Wikipédia...`;
        if (buscador.erro) return 'Erro na busca';
        if (buscador.resultados === null) return '';
        return buscador.resultados.length
            ? `${plural(buscador.resultados.length, 'resultado', 'resultados')} para "${buscador.termo}"`
            : `Nenhum resultado para "${buscador.termo}".`;
    }

    /** Cartões da busca: erro (com nova tentativa) ou resultados, cada um com um botão de ação. */
    function elementosDaBusca(buscador, textoAcao, aoAcionar) {
        if (buscador.erro) {
            const tentar = el('button', { type: 'button', texto: 'Tentar novamente' });
            tentar.addEventListener('click', () => buscador.buscar(buscador.termo));
            return [el('div', { classe: 'mensagem mensagem-erro', role: 'alert' }, el('span', { texto: mensagemErroBusca(buscador.erro) }), tentar)];
        }
        return (buscador.resultados ?? []).map((conceito) => {
            const botao = el('button', { type: 'button', texto: textoAcao });
            botao.addEventListener('click', () => aoAcionar(conceito));
            return criarCartaoConceito(conceito, botao);
        });
    }

    /* ---- painel lateral: pesquisar e cadastrar como material ---- */

    const buscaPainel = criarBuscador(() => desenharConceitos());

    /** Conceitos já guardados nos materiais (sem repetir o mesmo verbete). */
    function conceitosSalvos() {
        const vistos = new Map();
        estado.materiais.forEach((material) => material.conceitos.forEach((conceito) => {
            if (!vistos.has(conceito.url)) vistos.set(conceito.url, { ...conceito, materialId: material.id });
        }));
        return [...vistos.values()];
    }

    function desenharConceitos() {
        const lista = $('#lista-conceitos');
        const emBusca = buscaPainel.carregando || buscaPainel.erro || buscaPainel.resultados !== null;
        lista.classList.toggle('carregando', buscaPainel.carregando);
        $('#limpar-conceitos').hidden = !emBusca;

        if (emBusca) {
            $('#legenda-conceitos').textContent = legendaDaBusca(buscaPainel);
            if (!buscaPainel.carregando) {
                lista.replaceChildren(...elementosDaBusca(buscaPainel, 'Cadastrar como material', (conceito) => abrirFormulario(null, conceito)));
            }
            return;
        }

        const salvos = conceitosSalvos();
        $('#legenda-conceitos').textContent = salvos.length
            ? 'Conceitos salvos nos seus materiais'
            : 'Pesquise um conceito (ex.: Algoritmo) para ver o resumo da Wikipédia.';
        lista.replaceChildren(...salvos.map((conceito) => {
            const abrir = el('button', { type: 'button', texto: 'Abrir material' });
            abrir.addEventListener('click', () => abrirDetalhes(conceito.materialId));
            return criarCartaoConceito(conceito, abrir);
        }));
    }

    /* ---- detalhes do material: vincular conceitos ---- */

    const buscaDetalhe = criarBuscador(() => desenharBuscaDoDetalhe(), 3);

    function desenharBuscaDoDetalhe() {
        $('#legenda-conceito-detalhe').textContent = legendaDaBusca(buscaDetalhe);
        $('#resultado-conceito-detalhe').classList.toggle('carregando', buscaDetalhe.carregando);
        if (!buscaDetalhe.carregando) {
            $('#resultado-conceito-detalhe').replaceChildren(...elementosDaBusca(buscaDetalhe, 'Vincular ao material', vincularConceito));
        }
    }

    function desenharConceitosDoMaterial(material) {
        $('#detalhe-conceitos').replaceChildren(...(material.conceitos.length
            ? material.conceitos.map((conceito, indice) => {
                const remover = el('button', { type: 'button', classe: 'remover', dados: { removerConceito: indice }, 'aria-label': `Remover o conceito ${conceito.titulo}`, texto: 'Remover' });
                return criarCartaoConceito(conceito, remover);
            })
            : [el('p', { classe: 'dica', texto: 'Nenhum conceito vinculado ainda. Busque abaixo para adicionar.' })]));
        desenharBuscaDoDetalhe();
    }

    function vincularConceito(conceito) {
        const material = buscarMaterial(estado.detalheId);
        if (!material) return;
        if (material.conceitos.some((item) => item.url === conceito.url)) {
            mostrarMensagem(`"${conceito.titulo}" já está vinculado a este material.`, 'aviso');
            return;
        }
        atualizarMaterial(material.id, (item) => item.conceitos.push({ titulo: conceito.titulo, resumo: conceito.resumo, url: conceito.url }),
            desenharConceitosDoMaterial, `Conceito "${conceito.titulo}" vinculado ao material.`);
    }

    function iniciarConceitos() {
        $('#form-conceito').addEventListener('submit', (evento) => {
            evento.preventDefault();
            buscaPainel.buscar($('#termo-conceito').value);
        });
        $('#limpar-conceitos').addEventListener('click', () => {
            buscaPainel.limpar();
            $('#termo-conceito').value = '';
            desenharConceitos();
        });

        $('#form-conceito-detalhe').addEventListener('submit', (evento) => {
            evento.preventDefault();
            buscaDetalhe.buscar($('#termo-conceito-detalhe').value);
        });
        $('#detalhe-conceitos').addEventListener('click', (evento) => {
            const botao = evento.target.closest('button[data-remover-conceito]');
            if (!botao) return;
            atualizarMaterial(estado.detalheId, (item) => item.conceitos.splice(Number(botao.dataset.removerConceito), 1),
                desenharConceitosDoMaterial, 'Conceito removido do material.');
        });
    }

    /* ------------------------------------------------------------- tema --- */

    /** Alterna entre tema claro (padrão) e escuro. */
    function iniciarTema() {
        const botao = $('.modo');
        botao.addEventListener('click', () => {
            const escuro = document.documentElement.classList.toggle('dark');
            botao.setAttribute('aria-pressed', String(escuro));
            botao.textContent = escuro ? '☀️ Modo' : '🌙 Modo';
        });
    }

    carregarDados();
    iniciarCadastro();
    iniciarPesquisa();
    iniciarConceitos();
    desenharTudo();
    iniciarDetalhes();
    iniciarExclusao();
    iniciarTema();
})();
