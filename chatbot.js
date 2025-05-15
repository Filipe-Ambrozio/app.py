// 📦 Importações
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { Client } = require('whatsapp-web.js');

// 📁 Caminho do "banco de dados"
const DB_FILE = path.resolve(__dirname, 'db.json');

// 📦 Funções de banco de dados local
const loadDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ usuarios: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
};

const saveDB = (db) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

const saveUserData = (userId, userData) => {
    const db = loadDB();
    db.usuarios[userId] = { ...db.usuarios[userId], ...userData };
    saveDB(db);
};

// 🤖 Inicialização do WhatsApp
const client = new Client();
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Tudo certo! WhatsApp conectado.'));
client.initialize();

// ⏱ Delay utilitário
const delay = ms => new Promise(res => setTimeout(res, ms));

// 📥 Armazena o progresso do usuário
const userState = {};

client.on('message', async msg => {
    const from = msg.from;
    const text = msg.body.trim().toLowerCase();
    const chat = await msg.getChat();

    // MENU INICIAL
    if (/^(menu|oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(msg.body) && from.endsWith('@c.us')) {
        const contact = await msg.getContact();
        const name = contact.pushname || 'Aluno';

        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(from,
            `Olá, ${name.split(' ')[0]}! 👋\nSou o assistente virtual do *Portal do Aluno (ECS)*.\nComo posso te ajudar hoje?\n\n` +
            `1️⃣ Cadastro Escolar\n2️⃣ Atualização Cadastral\n3️⃣ Valores dos Planos\n4️⃣ Boletim Estudantil\n5️⃣ Sobre Nós\n6️⃣ Outras Perguntas`
        );

        userState[from] = { step: null, data: {} };
        return;
    }

    // === 1 - Cadastro Escolar ===
    if (text === '1') {
        userState[from] = { step: 'cadastro_nome', data: {} };
        return await client.sendMessage(from, '📚 Vamos iniciar seu *Cadastro Escolar*.\nQual o seu *nome completo*?');
    }

    if (userState[from]?.step === 'cadastro_nome') {
        userState[from].data.nome = msg.body;
        userState[from].step = 'cadastro_cpf';
        return await client.sendMessage(from, '📄 Agora, informe seu *CPF*:');
    }

    if (userState[from]?.step === 'cadastro_cpf') {
        userState[from].data.cpf = msg.body;
        userState[from].step = 'cadastro_rua';
        return await client.sendMessage(from, '🏠 Qual a *sua rua*?');
    }

    if (userState[from]?.step === 'cadastro_rua') {
        userState[from].data.rua = msg.body;
        userState[from].step = 'cadastro_bairro';
        return await client.sendMessage(from, '🏘️ Informe o *bairro*:');
    }

    if (userState[from]?.step === 'cadastro_bairro') {
        userState[from].data.bairro = msg.body;
        userState[from].step = 'cadastro_nascimento';
        return await client.sendMessage(from, '📅 Qual a sua *data de nascimento*? (DD/MM/AAAA)');
    }

    if (userState[from]?.step === 'cadastro_nascimento') {
        userState[from].data.nascimento = msg.body;
        userState[from].step = 'cadastro_pai';
        return await client.sendMessage(from, '👨 Nome do *pai*:');
    }

    if (userState[from]?.step === 'cadastro_pai') {
        userState[from].data.pai = msg.body;
        userState[from].step = 'cadastro_mae';
        return await client.sendMessage(from, '👩 Nome da *mãe*:');
    }

    if (userState[from]?.step === 'cadastro_mae') {
        userState[from].data.mae = msg.body;
        userState[from].step = 'cadastro_telefone';
        return await client.sendMessage(from, '📱 Informe seu *telefone* (com DDD):');
    }

    if (userState[from]?.step === 'cadastro_telefone') {
        userState[from].data.telefone = msg.body;
        userState[from].step = 'cadastro_email';
        return await client.sendMessage(from, '✉️ Informe seu *e-mail*:');
    }

    if (userState[from]?.step === 'cadastro_email') {
        userState[from].data.email = msg.body;

        // 💾 Salvar no banco de dados local
        saveUserData(from, userState[from].data);

        await client.sendMessage(from,
            `✅ *Cadastro concluído com sucesso!*\n\n` +
            `🔗 Link para confirmação: https://site.com`
        );

        delete userState[from];
        return;
    }

    // === 2 - Atualização Cadastral ===
    if (text === '2') {
        userState[from] = { step: 'atualizacao_campo' };
        return await client.sendMessage(from,
            '🛠️ *Atualização Cadastral*\nQual campo deseja atualizar?\n\n' +
            '1️⃣ Nome\n2️⃣ Rua\n3️⃣ Bairro\n4️⃣ Telefone\n5️⃣ E-mail'
        );
    }

    if (userState[from]?.step === 'atualizacao_campo') {
        const campos = { '1': 'nome', '2': 'rua', '3': 'bairro', '4': 'telefone', '5': 'email' };
        const campo = campos[msg.body];

        if (campo) {
            userState[from] = { step: 'atualizar_valor', campo };
            return await client.sendMessage(from, `✏️ Informe o novo valor para *${campo}*:`);
        } else {
            return await client.sendMessage(from, '❌ Opção inválida. Tente novamente digitando 1 a 5.');
        }
    }

    if (userState[from]?.step === 'atualizar_valor') {
        const campo = userState[from].campo;
        const novoValor = msg.body;

        // 💾 Atualizar campo no banco de dados
        saveUserData(from, { [campo]: novoValor });

        await client.sendMessage(from, `✅ *${campo.charAt(0).toUpperCase() + campo.slice(1)}* atualizado com sucesso!`);
        delete userState[from];
        return;
    }

    // === 3 - Valores dos Planos ===
    if (text === '3') {
        await delay(1000); await chat.sendStateTyping();
        return await client.sendMessage(from,
            `💰 *Planos disponíveis:*\n\n` +
            `👤 *Individual:* R$22,50/mês\n👨‍👩‍👧‍👦 *Família:* R$39,90/mês (você + 3 dependentes)\n` +
            `🔝 *TOP Individual:* R$42,50/mês\n🔝 *TOP Família:* R$79,90/mês\n\n` +
            `🔗 Link para adesão: https://site.com`
        );
    }

    // === 4 - Boletim Estudantil ===
    if (text === '4') {
        await delay(1000); await chat.sendStateTyping();
        return await client.sendMessage(from,
            `📋 *Boletim Estudantil*\n\nPara consultar, envie:\n- Nome completo\n- Data de nascimento\n- Nº de matrícula (se tiver)\n\nOu acesse: https://site.com/boletim`
        );
    }

    // === 5 - Sobre Nós ===
    if (text === '5') {
        await delay(1000); await chat.sendStateTyping();
        return await client.sendMessage(from,
            `🏫 *Sobre Nós*\n\nSomos o Portal do Aluno (ECS), unindo educação e saúde.\n` +
            `✔️ Atendimento médico 24h\n✔️ Cursos gratuitos\n✔️ Planos sem carência\n\n🔗 Saiba mais: https://site.com`
        );
    }

    // === 6 - Outras Perguntas ===
    if (text === '6') {
        await delay(1000); await chat.sendStateTyping();
        return await client.sendMessage(from,
            `❓ Pode me mandar sua dúvida e farei o possível para ajudar!\nDigite *menu* a qualquer momento para recomeçar.`
        );
    }
});
