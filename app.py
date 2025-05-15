import streamlit as st
import json
import os
from datetime import datetime

# Caminho do arquivo de banco de dados
DB_FILE = 'db.json'

# Função para carregar o banco de dados
def load_db():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w') as f:
            json.dump({'usuarios': {}}, f, indent=2)
    with open(DB_FILE, 'r') as f:
        return json.load(f)

# Função para salvar no banco de dados
def save_db(db):
    with open(DB_FILE, 'w') as f:
        json.dump(db, f, indent=2)

# Função para realizar o cadastro
def realizar_cadastro():
    st.title("Cadastro Escolar")

    nome = st.text_input("Nome completo:")
    cpf = st.text_input("CPF (somente números, 11 dígitos):")
    if len(cpf) != 11 and cpf != "":
        st.warning("O CPF deve ter 11 dígitos.")
    
    rua = st.text_input("Rua:")
    bairro = st.text_input("Bairro:")
    
    nascimento = st.date_input("Data de Nascimento:", min_value=datetime(1988, 1, 1))
    nascimento_str = nascimento.strftime('%d/%m/%Y')

    pai = st.text_input("Nome do Pai:")
    mae = st.text_input("Nome da Mãe:")
    telefone = st.text_input("Telefone (com DDD):")
    email = st.text_input("E-mail:")

    if st.button("Cadastrar"):
        if len(cpf) == 11:
            # Salva os dados no banco
            db = load_db()
            usuario_id = cpf  # Usando CPF como chave
            db['usuarios'][usuario_id] = {
                'nome': nome,
                'cpf': cpf,
                'rua': rua,
                'bairro': bairro,
                'nascimento': nascimento_str,
                'pai': pai,
                'mae': mae,
                'telefone': telefone,
                'email': email,
                'data_cadastro': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
                'status_matricula': 'Ativa'  # Status da matrícula
            }
            save_db(db)
            st.success("Cadastro realizado com sucesso!")
        else:
            st.error("Por favor, digite um CPF válido com 11 dígitos.")

# Função para atualizar dados cadastrais
def atualizar_dados():
    st.title("Atualização Cadastral")

    if 'cpf_busca' not in st.session_state:
        st.session_state.cpf_busca = ''
    if 'usuario_encontrado' not in st.session_state:
        st.session_state.usuario_encontrado = None

    cpf_input = st.text_input("Informe seu CPF para atualização:", value=st.session_state.cpf_busca)

    if st.button("Buscar"):
        db = load_db()
        usuario = db['usuarios'].get(cpf_input)
        if usuario:
            st.session_state.cpf_busca = cpf_input
            st.session_state.usuario_encontrado = usuario
        else:
            st.session_state.usuario_encontrado = None
            st.error("Usuário não encontrado!")

    if st.session_state.usuario_encontrado:
        usuario = st.session_state.usuario_encontrado
        if usuario.get('status_matricula') == 'Cancelada':
            st.error(f"Este cadastro foi cancelado em {usuario.get('data_cancelamento', 'data desconhecida')}. Não é possível atualizá-lo.")
            return

        st.write(f"**Nome:** {usuario['nome']}")
        st.write(f"**Data de Nascimento:** {usuario['nascimento']}")
        st.write(f"**Pai:** {usuario['pai']}")
        st.write(f"**Mãe:** {usuario['mae']}")

        campos_editaveis = {
            "Rua": usuario.get("rua", ""),
            "Bairro": usuario.get("bairro", ""),
            "Telefone": usuario.get("telefone", ""),
            "E-mail": usuario.get("email", "")
        }

        campo_escolhido = st.selectbox("Qual campo deseja atualizar?", list(campos_editaveis.keys()))
        novo_valor = st.text_input(f"Novo valor para {campo_escolhido}:", value=campos_editaveis[campo_escolhido])

        if st.button("Atualizar"):
            db = load_db()
            db['usuarios'][st.session_state.cpf_busca][campo_escolhido.lower()] = novo_valor
            save_db(db)
            st.success(f"{campo_escolhido} atualizado com sucesso!")
            st.session_state.usuario_encontrado[campo_escolhido.lower()] = novo_valor

# Função para cancelar matrícula
def cancelar_matricula():
    st.title("Cancelar Matrícula")

    if 'cpf_cancelamento' not in st.session_state:
        st.session_state.cpf_cancelamento = ''
    if 'usuario_para_cancelar' not in st.session_state:
        st.session_state.usuario_para_cancelar = None

    cpf_input = st.text_input("Informe seu CPF para cancelamento:", value=st.session_state.cpf_cancelamento)

    if st.button("Buscar"):
        db = load_db()
        usuario = db['usuarios'].get(cpf_input)
        if usuario:
            st.session_state.cpf_cancelamento = cpf_input
            st.session_state.usuario_para_cancelar = usuario
        else:
            st.session_state.usuario_para_cancelar = None
            st.error("Usuário não encontrado!")

    if st.session_state.usuario_para_cancelar:
        usuario = st.session_state.usuario_para_cancelar
        st.write(f"**Nome do Aluno:** {usuario['nome']}")
        status = usuario.get("status_matricula", "Ativa")
        st.write(f"**Status atual da matrícula:** {status}")

        if status == "Cancelada":
            st.warning(f"Esta matrícula já foi cancelada em {usuario.get('data_cancelamento', 'data desconhecida')}.")
        else:
            if st.button("Cancelar Matrícula"):
                db = load_db()
                db['usuarios'][st.session_state.cpf_cancelamento]['status_matricula'] = 'Cancelada'
                db['usuarios'][st.session_state.cpf_cancelamento]['data_cancelamento'] = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
                save_db(db)
                st.success("✅ Matrícula cancelada com sucesso!")
                st.write(f"Matrícula cancelada em {db['usuarios'][st.session_state.cpf_cancelamento]['data_cancelamento']}")
                st.session_state.usuario_para_cancelar['status_matricula'] = 'Cancelada'

# Função para exibir planos
def exibir_planos():
    st.title("Valores dos Planos")
    st.write("""
    💰 *Planos disponíveis:*
    - 👤 *Individual:* R$22,50/mês
    - 👨‍👩‍👧‍👦 *Família:* R$39,90/mês (você + 3 dependentes)
    - 🔝 *TOP Individual:* R$42,50/mês
    - 🔝 *TOP Família:* R$79,90/mês
    """)

# Função para exibir informações sobre a instituição
def sobre_nos():
    st.title("Sobre Nós")
    st.write("""
    🏫 *Sobre Nós*
    Somos o Portal do Aluno (ECS), unindo educação e saúde.
    - ✔️ Atendimento médico 24h
    - ✔️ Cursos gratuitos
    - ✔️ Planos sem carência
    """)

# Função principal
def main():
    st.sidebar.title("Menu")
    menu = st.sidebar.radio("Escolha uma opção", ["Cadastro Escolar", "Atualização Cadastral", "Valores dos Planos", "Sobre Nós", "Cancelar Matrícula"])

    if menu == "Cadastro Escolar":
        realizar_cadastro()
    elif menu == "Atualização Cadastral":
        atualizar_dados()
    elif menu == "Valores dos Planos":
        exibir_planos()
    elif menu == "Sobre Nós":
        sobre_nos()
    elif menu == "Cancelar Matrícula":
        cancelar_matricula()

if __name__ == "__main__":
    main()
