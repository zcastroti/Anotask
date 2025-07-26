// VARIÁVEL GLOBAL PARA O ITEM ARRASTADO
let draggedItem = null;

// COLE A SUA CONFIGURAÇÃO DO FIREBASE AQUI
// Esta configuração é gerada pelo console do Firebase quando você adiciona um aplicativo web.
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDkJP594Em_AdjLqSCfRO0NbdLN5g9nHAM",
  authDomain: "anotask-app.firebaseapp.com",
  projectId: "anotask-app",
  storageBucket: "anotask-app.firebasestorage.app",
  messagingSenderId: "480198412150",
  appId: "1:480198412150:web:3d6dac353167fb522adc57",
  measurementId: "G-RZGDZG2NBY"
};

// Inicializa o Firebase e o Cloud Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Obtém uma referência ao serviço Firestore

// --- Funções Auxiliares de Salvar/Carregar com Firebase ---

/**
 * Salva todas as tarefas atualmente visíveis na tabela no Cloud Firestore.
 * As tarefas são armazenadas como um array de strings (apenas os nomes das tarefas).
 */
async function salvarTarefasFirebase() {
    const tbody = document.querySelector('table tbody');
    const linhasTarefa = tbody.querySelectorAll('tr');
    const tarefas = [];

    linhasTarefa.forEach(linha => {
        // Pega o texto da segunda célula (o nome da tarefa)
        // Certifique-se de que esta é a célula correta que contém o nome da tarefa
        const nomeTarefa = linha.querySelector('td:last-child').textContent;
        tarefas.push(nomeTarefa);
    });

    try {
        // Para simplificar, estamos salvando todas as tarefas em um único documento fixo.
        // O ID 'user1' é apenas um exemplo. Em uma aplicação real com login,
        // este ID seria o ID único do usuário autenticado.
        await db.collection('tarefas').doc('user1').set({
            listaDeTarefas: tarefas
        });
        console.log("Tarefas salvas no Firestore!");
    } catch (e) {
        console.error("Erro ao salvar as tarefas no Firestore: ", e);
    }
}

/**
 * Carrega as tarefas salvas no Cloud Firestore e as adiciona à tabela.
 * Esta função é executada automaticamente quando a página é carregada.
 */
async function carregarTarefasFirebase() {
    try {
        // Tenta obter o documento de tarefas para o 'user1'
        const doc = await db.collection('tarefas').doc('user1').get();

        if (doc.exists) { // Verifica se o documento existe
            const dados = doc.data(); // Pega os dados do documento
            const tarefas = dados.listaDeTarefas || []; // Pega o array de tarefas, ou um array vazio se não existir

            const tbody = document.querySelector('table tbody');
            tbody.innerHTML = ''; // Limpa a tabela antes de carregar

            tarefas.forEach(nomeTarefa => {
                adicionarTarefaNaTabela(nomeTarefa); // Reutiliza a função auxiliar para criar a UI
            });
            console.log("Tarefas carregadas do Firestore!");
        } else {
            console.log("Nenhum dado de tarefa encontrado no Firestore para este usuário.");
        }
    } catch (e) {
        console.error("Erro ao carregar as tarefas do Firestore: ", e);
    }
}


/**
 * Função auxiliar para adicionar uma tarefa na tabela (cria os elementos HTML da linha).
 * É usada tanto ao adicionar uma nova tarefa quanto ao carregar tarefas existentes.
 * Também configura os eventos de arrastar e soltar (drag and drop) para a linha.
 * @param {string} nomeTarefa - O nome da tarefa a ser adicionada/exibida.
 */
function adicionarTarefaNaTabela(nomeTarefa) {
    const tbody = document.querySelector('table tbody'); // Referência ao corpo da tabela
    const novaLinha = document.createElement('tr'); // Cria um novo elemento <tr> (linha da tabela)

    // Torna a linha arrastável (Drag and Drop)
    novaLinha.setAttribute('draggable', 'true');

    // --- Eventos de Drag and Drop para a linha (<tr>) ---
    novaLinha.addEventListener('dragstart', (e) => {
        draggedItem = novaLinha;
        setTimeout(() => novaLinha.classList.add('dragging'), 0);
        e.dataTransfer.setData('text/plain', nomeTarefa);
    });

    novaLinha.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.target.closest('tr') !== draggedItem) {
            const currentItem = e.target.closest('tr');
            if (currentItem && currentItem !== draggedItem) {
                document.querySelectorAll('tbody tr').forEach(row => row.classList.remove('drag-over'));
                currentItem.classList.add('drag-over');
            }
        }
    });

    novaLinha.addEventListener('dragleave', (e) => {
        e.target.closest('tr').classList.remove('drag-over');
    });

    novaLinha.addEventListener('drop', (e) => {
        e.preventDefault();
        document.querySelectorAll('tbody tr').forEach(row => row.classList.remove('drag-over'));

        if (draggedItem) {
            const dropTarget = e.target.closest('tr');
            if (dropTarget && draggedItem !== dropTarget) {
                const rect = dropTarget.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;

                if (e.clientY < centerY) {
                    tbody.insertBefore(draggedItem, dropTarget);
                } else {
                    tbody.insertBefore(draggedItem, dropTarget.nextSibling);
                }
                salvarTarefasFirebase(); // Salva a nova ordem
            }
        }
    });

    novaLinha.addEventListener('dragend', () => {
        novaLinha.classList.remove('dragging');
        draggedItem = null;
    });

    // --- Criação dos elementos da célula de ação (botão de engrenagem e menu) ---
    const celulaAcao = document.createElement('td');
    celulaAcao.classList.add('col-acao');

    const botaoEngrenagem = document.createElement('input');
    botaoEngrenagem.type = 'button';
    botaoEngrenagem.value = '⚙';
    botaoEngrenagem.classList.add('estiloBotao', 'botaoEngrenagem');

    const opcoesEngrenagemDiv = document.createElement('div');
    opcoesEngrenagemDiv.classList.add('opcoesEngrenagem');
    opcoesEngrenagemDiv.style.display = 'none';

    const botaoEditar = document.createElement('button');
    botaoEditar.textContent = 'Editar';
    botaoEditar.classList.add('opcao');
    botaoEditar.onclick = function() {
        const celulaNomeTarefa = novaLinha.querySelector('td:last-child');
        exibirCaixaRenomearTarefa(celulaNomeTarefa, celulaNomeTarefa.textContent);
        opcoesEngrenagemDiv.style.display = 'none';
    };

    const botaoExcluir = document.createElement('button');
    botaoExcluir.textContent = 'Excluir';
    botaoExcluir.classList.add('opcao');
    botaoExcluir.onclick = function() {
        if (confirm(`Tem certeza que deseja excluir a tarefa "${nomeTarefa}"?`)) {
            novaLinha.remove();
            salvarTarefasFirebase(); // Salva após exclusão
        }
        opcoesEngrenagemDiv.style.display = 'none';
    };

    opcoesEngrenagemDiv.appendChild(botaoEditar);
    opcoesEngrenagemDiv.appendChild(botaoExcluir);

    botaoEngrenagem.onclick = function(event) {
        event.stopPropagation();

        document.querySelectorAll('.opcoesEngrenagem').forEach(opcoes => {
            if (opcoes !== opcoesEngrenagemDiv) {
                opcoes.style.display = 'none';
            }
        });

        if (opcoesEngrenagemDiv.style.display === 'none' || opcoesEngrenagemDiv.style.display === '') {
            opcoesEngrenagemDiv.style.display = 'flex';
        } else {
            opcoesEngrenagemDiv.style.display = 'none';
        }
    };

    celulaAcao.appendChild(botaoEngrenagem);
    celulaAcao.appendChild(opcoesEngrenagemDiv);

    // --- Criação da célula para o nome da tarefa ---
    const celulaNomeTarefa = document.createElement('td');
    celulaNomeTarefa.textContent = nomeTarefa;

    novaLinha.appendChild(celulaAcao);
    novaLinha.appendChild(celulaNomeTarefa);

    tbody.appendChild(novaLinha);
}


// --- Função Principal de Adicionar Tarefa (chamada pelo botão 'Adicionar' do HTML) ---

function adicionarTarefa() {
    const inputTarefa = document.getElementById('addTask');
    const nomeTarefa = inputTarefa.value.trim();

    if (nomeTarefa === '') {
        alert('Por favor, digite o nome da tarefa!');
        return;
    }

    adicionarTarefaNaTabela(nomeTarefa);
    inputTarefa.value = '';

    salvarTarefasFirebase(); // Salva no Firebase

    // Listener de clique global para fechar menus de engrenagem
    if (!document.body.hasAttribute('data-global-click-listener-added')) {
        document.addEventListener('click', function(event) {
            const clicouNoBotaoEngrenagem = event.target.closest('.botaoEngrenagem');
            const clicouNoMenuEngrenagem = event.target.closest('.opcoesEngrenagem');
            const clicouNoOverlay = event.target.closest('.overlay');

            if (!clicouNoBotaoEngrenagem && !clicouNoMenuEngrenagem && !clicouNoOverlay) {
                document.querySelectorAll('.opcoesEngrenagem').forEach(opcoes => {
                    opcoes.style.display = 'none';
                });
            }
        });
        document.body.setAttribute('data-global-click-listener-added', 'true');
    }
}


// --- Função para criar e exibir a caixa de renomear tarefa (modal) ---
/**
 * Exibe uma caixa de diálogo modal para renomear uma tarefa.
 * @param {HTMLElement} tarefaExistenteTD - A referência à célula <td> que contém o nome da tarefa.
 * @param {string} nomeAtualDaTarefa - O nome atual da tarefa para preencher o input.
 */
function exibirCaixaRenomearTarefa(tarefaExistenteTD, nomeAtualDaTarefa) {
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');

    const caixaRenomear = document.createElement('div');
    caixaRenomear.style.cssText = `
        background: white;
        padding: 20px;
        border: 1px solid #222;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 90%;
        width: 300px;
    `;

    const titulo = document.createElement('h2');
    titulo.textContent = 'Renomear Tarefa';
    titulo.style.cssText = `
        color: var(--corPrincipal);
        font-size: 20px;
        margin-bottom: 10px;
        text-align: center;
    `;

    const inputRenomear = document.createElement('input');
    inputRenomear.type = 'text';
    inputRenomear.value = nomeAtualDaTarefa;
    inputRenomear.placeholder = 'Novo nome da tarefa';
    inputRenomear.style.cssText = `
        padding: 5px;
        height: 35px;
        font-size: 16px;
        border: 1px solid #ccc;
    `;
    inputRenomear.focus();

    const divBotoes = document.createElement('div');
    divBotoes.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 10px;
    `;

    const botaoSalvar = document.createElement('button');
    botaoSalvar.textContent = 'Salvar';
    botaoSalvar.classList.add('estiloBotao');
    botaoSalvar.style.margin = '0';

    const botaoCancelar = document.createElement('button');
    botaoCancelar.textContent = 'Cancelar';
    botaoCancelar.classList.add('estiloBotao');
    botaoCancelar.style.margin = '0';
    botaoCancelar.style.background = '#888';

    caixaRenomear.appendChild(titulo);
    caixaRenomear.appendChild(inputRenomear);
    divBotoes.appendChild(botaoCancelar);
    divBotoes.appendChild(botaoSalvar);
    caixaRenomear.appendChild(divBotoes);

    document.body.appendChild(overlay);
    document.body.appendChild(caixaRenomear);

    botaoSalvar.onclick = function() {
        const novoNome = inputRenomear.value.trim();
        if (novoNome !== '') {
            tarefaExistenteTD.textContent = novoNome;
            fecharCaixaRenomear();
            salvarTarefasFirebase(); // Salva após edição
        } else {
            alert('O nome da tarefa não pode ser vazio!');
            inputRenomear.focus();
        }
    };

    botaoCancelar.onclick = fecharCaixaRenomear;
    overlay.onclick = fecharCaixaRenomear;

    function fecharCaixaRenomear() {
        document.body.removeChild(overlay);
        document.body.removeChild(caixaRenomear);
    }
}

// --- Carregar tarefas quando a página é completamente carregada ---
document.addEventListener('DOMContentLoaded', carregarTarefasFirebase);