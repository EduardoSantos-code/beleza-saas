# Guia Completo do TratoMarcado

O **TratoMarcado** é uma plataforma SaaS (Software as a Service) de elite projetada para barbearias, salões de beleza e clínicas de estética modernos. A plataforma combina agendamento online automático, aplicativo móvel integrado (PWA), disparos automatizados de WhatsApp, controle de estoque de produtos, e um **Clube de Assinatura Recorrente** inédito para garantir estabilidade financeira e fidelização de clientes.

Este guia serve como manual oficial de todas as funcionalidades da plataforma, detalhando o funcionamento tanto para administradores e profissionais quanto para os clientes finais.

---

## Sumário
1. [Painel do Salão (Dashboard Admin)](#1-painel-do-salão-dashboard-admin)
   - [Configurações e Identidade Visual (Branding)](#configurações-e-identidade-visual-branding)
   - [Cadastro de Serviços](#cadastro-de-serviços)
   - [Cadastro da Equipe (Profissionais e Comissões)](#cadastro-da-equipe-profissionais-e-comissões)
   - [Gerenciamento de Horários (Salão e Profissionais)](#gerenciamento-de-horários-salão-e-profissionais)
   - [Gestão da Agenda (Schedules & Blocks)](#gestão-da-agenda-schedules--blocks)
   - [Gestão de Clientes e Indicadores de Faltas](#gestão-de-clientes-e-indicadores-de-faltas)
2. [Integração de WhatsApp](#2-integração-de-whatsapp)
   - [Conexão da API (Evolution API)](#conexão-da-api-evolution-api)
   - [Disparos de Lembretes Automáticos](#disparos-de-lembretes-automáticos)
3. [Clube de Assinatura Recorrente](#3-clube-de-assinatura-recorrente)
   - [Como Funciona o Clube](#como-funciona-o-clube)
   - [Integração de Pagamento (Asaas e Mercado Pago)](#integração-de-pagamento-asaas-e-mercado-pago)
   - [Configuração de Planos e Benefícios](#configuração-de-planos-e-benefícios)
   - [Gestão de Assinantes](#gestão-de-assinantes)
4. [Catálogo de Produtos e Reservas](#4-catálogo-de-produtos-e-reservas)
   - [Cadastro de Produtos e Controle de Estoque](#cadastro-de-produtos-e-controle-de-estoque)
   - [Fluxo de Reservas de Clientes](#fluxo-de-reservas-de-clientes)
   - [Aprovação e Retirada de Reservas](#aprovação-e-retirada-de-reservas)
5. [Experiência do Cliente (Portal de Agendamento)](#5-experiência-do-cliente-portal-de-agendamento)
   - [Instalação como Web App (PWA)](#instalação-como-web-app-pwa)
   - [Fluxo de Agendamento Público](#fluxo-de-agendamento-público)
   - [Autenticação sem Senha via WhatsApp](#autenticação-sem-senha-via-whatsapp)
   - [Portal do Cliente (Autogestão de Agendamentos e Benefícios)](#portal-do-cliente-autogestão-de-agendamentos-e-benefícios)
6. [Painel do Administrador Geral (Master)](#6-painel-do-administrador-geral-master)
   - [Indicadores Globais do SaaS](#indicadores-globais-do-saas)
   - [Gestão de Salões e Planos de Assinatura](#gestão-de-salões-e-planos-de-assinatura)
   - [Central de Avisos Globais](#central-de-avisos-globais)

---

## 1. Painel do Salão (Dashboard Admin)

O painel de controle do salão é acessível pelo link `/admin/[slug]`, onde `[slug]` é a identificação única do salão configurada no cadastro (ex: `/admin/barbearia-premium`). O acesso é restrito a usuários com perfis de permissão específicos:
*   **OWNER (Dono):** Acesso total a configurações financeiras, dados de faturamento, comissões, clube de assinatura e configurações de equipe.
*   **MANAGER (Gerente):** Gerencia a agenda, clientes, catálogo de serviços/produtos e equipe, mas possui restrições em configurações de cobrança da plataforma.
*   **STAFF (Profissionais/Atendentes):** Visualiza e gerencia a própria agenda de atendimentos, sem acesso a dados financeiros globais ou configurações do estabelecimento.

### Configurações e Identidade Visual (Branding)
Na seção **Personalização / Branding**, o salão define como sua página pública aparecerá para os clientes:
1.  **Nome e Slug:** O nome fantasia e o slug que dita o link de acesso (ex: `/s/nome-do-salao`).
2.  **Logo e Capa (Hero):** Upload da logomarca (exibida no header do PWA) e imagem de capa (exibida no topo da tela de agendamentos).
3.  **Cor Principal:** Seletor hexadecimal (ex: `#7c3aed`) que aplica o tema de cores personalizado (botões, badges e destaques) em todo o app do cliente.
4.  **Links e Contatos:** Cadastro do telefone público, descrição institucional do salão e link do perfil do Instagram.
5.  **Antecedência Mínima:** Configuração do tempo mínimo necessário para que um cliente faça um agendamento online (ex: mínimo de 2 horas de antecedência).

### Cadastro de Serviços
O catálogo de serviços define o que o cliente pode agendar. Cada serviço possui:
*   **Nome e Preço:** Valor cobrado em Reais (armazenado internamente em centavos para evitar erros de precisão decimal).
*   **Duração (minutos):** O tempo estimado de execução (ex: 30 min, 45 min, 1 hora). Essa duração é fundamental para o algoritmo de blocos de horários livres da agenda.
*   **Status Ativo/Inativo:** Serviços desativados não aparecem para novos agendamentos no PWA, mas permanecem no histórico de relatórios.

### Cadastro da Equipe (Profissionais e Comissões)
Na aba **Profissionais**, a gerência gerencia a equipe técnica:
*   **Taxa de Comissão:** Percentual de ganho do profissional sobre os serviços executados por ele (ex: 50%).
*   **Telefone:** Número celular formatado em padrão internacional (E.164) para comunicações e notificações internas.
*   **Ativação:** Capacidade de desativar temporariamente um profissional (ele deixa de constar na escala de agendamento, mas não apaga seu histórico).

### Gerenciamento de Horários (Salão e Profissionais)
O TratoMarcado trabalha com um sistema duplo de calendário para calcular a disponibilidade de horários:
1.  **Horário de Funcionamento do Estabelecimento (Tenant Business Hours):** Define os dias da semana (Segunda a Domingo) em que o salão abre, o horário de início e fim geral, e os intervalos gerais de almoço/pausa.
2.  **Horário do Profissional (Professional Business Hours):** Permite customizar a escala de cada profissional individualmente. Um profissional pode folgar em um dia que o salão abre ou ter um horário diferenciado de entrada/pausa.

### Gestão da Agenda (Schedules & Blocks)
A tela de agenda (`AdminAppointmentsClient.tsx`) é o coração operacional do salão.
*   **Visualização Multiprofissional:** Exibição lado a lado dos horários de cada profissional para o dia selecionado.
*   **Status do Agendamento:** Os atendimentos passam por um ciclo de vida específico:
    - `PENDING` (Pendente): Aguardando horário ou confirmação.
    - `CONFIRMED` (Confirmado): Confirmado pelo cliente ou pelo salão.
    - `COMPLETED` (Concluído): Serviço executado com sucesso.
    - `NOSHOW` (Falta): O cliente não compareceu.
    - `CANCELED` (Cancelado): Desmarcado pelo cliente ou equipe.
*   **Bloqueios de Horário (Schedule Blocks):** Permite indisponibilizar horários específicos na agenda de um profissional (ex: consulta médica, folga à tarde, horário de almoço extra). Os blocos podem ser de dia inteiro ou com horários determinados, impedindo que clientes reservem esses períodos no site.

### Gestão de Clientes e Indicadores de Faltas
Cada cliente que agenda um serviço é automaticamente cadastrado no banco de dados. O painel lista todos os clientes e gera estatísticas automáticas importantes de comportamento:
*   **Agendamentos Concluídos:** Quantidade de vezes que o cliente compareceu.
*   **Faltas (No-Show Count):** Quantidade de vezes em que o cliente teve status marcado como `NOSHOW`. Utilizado para identificar clientes problemáticos.
*   **Cancelamentos em Cima da Hora (Late Cancel Count):** Cancelamentos feitos fora da janela estipulada de aviso prévio.

### Recuperação de Senha (Esqueceu a Senha?)
Caso um profissional ou administrador perca seu acesso ao painel de controle, o sistema oferece um fluxo seguro de redefinição de credenciais:
1.  **Solicitação:** Na tela de login (`/login`), basta clicar em **Esqueceu a senha?**.
2.  **Envio de Código:** O usuário preenche seu e-mail cadastrado e o sistema envia um e-mail de recuperação seguro usando o gateway **Resend**.
3.  **Redefinição:** Ao clicar no link recebido no e-mail, o usuário é direcionado para a tela de redefinição (`/reset-password?token=XYZ`), onde pode definir sua nova senha de forma segura.

---

## 2. Integração de WhatsApp

O TratoMarcado utiliza automação de WhatsApp de forma nativa para reduzir as faltas dos clientes (no-shows) e otimizar a comunicação.

### Conexão da API (Evolution API)
A plataforma integra-se a instâncias da Evolution API (ou provedores compatíveis) para disparar mensagens utilizando um chip de celular próprio do salão.
*   **Status de Conexão:** No menu **WhatsApp**, o administrador acompanha se o chip está conectado (`OPEN/CONECTADO`), conectando ou desconectado.
*   **Pareamento Facilitado:** Caso esteja desconectado, o sistema gera dinamicamente um **QR Code** ou fornece um **Pairing Code** (código de pareamento por digitação de número) para conectar o celular em menos de 1 minuto, idêntico ao processo do WhatsApp Web.

### Disparos de Lembretes Automáticos
Uma vez pareado, o sistema executa três automações principais por trás das cenas:
1.  **Confirmação de Agendamento:** Assim que o cliente realiza a reserva online, ele recebe uma mensagem no WhatsApp contendo o dia, horário, profissional escolhido, serviço e o link para cancelamento/gerenciamento caso necessário.
2.  **Lembrete Antecipado Automático:** Exatamente **2 horas antes** do horário agendado, o sistema dispara uma notificação de lembrete com botões interativos para o cliente confirmar a presença ou solicitar cancelamento.
3.  **Códigos de Autenticação:** Disparo rápido de códigos de segurança de 6 dígitos quando o cliente tenta acessar seu portal de agendamentos ou assinar o clube.

---

## 3. Clube de Assinatura Recorrente

Esta é uma funcionalidade estratégica do TratoMarcado, permitindo que salões criem planos de fidelização cobrados mensalmente de forma automática.

### Como Funciona o Clube
O salão cria planos (ex: "Clube da Barba e Cabelo") onde o cliente paga uma taxa mensal e ganha o direito de realizar um número determinado de serviços sem custo adicional, além de descontos em outros serviços do salão.
*   *Exemplo prático:* Plano de R$ 120,00/mês que dá direito a 2 cortes de cabelo por mês e 15% de desconto em qualquer outro serviço adicional (ex: barba).

### Integração de Pagamento (Asaas e Mercado Pago)
Para gerenciar a cobrança recorrente no cartão de crédito ou boleto/PIX, o salão configura seus próprios dados bancários na plataforma.
*   **Provedores Suportados:** **Asaas** ou **Mercado Pago**.
*   **Credenciais de Acesso:** Inserção da API Key (Asaas) ou Access Token/Public Key (Mercado Pago). O TratoMarcado armazena essas credenciais com criptografia forte no banco de dados (`clubAsaasApiKeyEnc` e `clubMercadoPagoAccessTokenEnc`) por segurança.
*   **Ambiente de Testes:** Suporte total a chaves de ambiente **SANDBOX** (para testar sem cobrar de cartões reais) e **PRODUCTION** (para cobranças reais).

### Configuração de Planos e Benefícios
Ao cadastrar um Plano do Clube (`ClubPlan`), o salão configura:
*   **Nome e Preço:** Valor cobrado do cliente no ciclo de faturamento.
*   **Ciclo de Cobrança:** Mensal (`MONTHLY`), Trimestral (`QUARTERLY`), Semestral (`SEMIANNUAL`) ou Anual (`YEARLY`).
*   **Serviço Incluso:** Seleção do serviço do catálogo que faz parte do benefício principal do plano.
*   **Quantidade de Usos:** Quantas vezes o cliente pode agendar esse serviço sem pagar no período (ex: 2x por mês).
*   **Desconto Adicional:** Percentual de desconto a ser aplicado automaticamente caso o cliente agende outros serviços fora da cota do plano (ex: 10% de desconto em outros procedimentos).

### Gestão de Assinantes
No painel do administrador:
*   **Acompanhamento de Status:** Filtros rápidos por assinaturas Ativas, Pendentes, Atrasadas (`OVERDUE`) ou Canceladas.
*   **Registro de Usos (Benefit Usage):** Toda vez que um cliente do clube agenda usando seus benefícios, o sistema abate o saldo disponível no período atual e gera um registro histórico (`ClubBenefitUsage`). Isso evita fraudes e permite que o salão saiba se o cliente já utilizou a cota do mês.
*   **Webhooks de Cobrança:** A plataforma escuta eventos automáticos dos provedores de pagamento (webhooks). Se uma mensalidade for paga, a assinatura é mantida ativa. Se houver falha de pagamento, o status muda automaticamente para atrasado ou cancelado, bloqueando o agendamento de benefícios.

---

## 4. Catálogo de Produtos e Reservas

O salão pode vender produtos físicos (ex: pomadas modeladoras, shampoos, óleos de barba) e permitir que os clientes reservem esses itens online para retirada no estabelecimento.

### Cadastro de Produtos e Controle de Estoque
No menu **Produtos** (`ProductsClient.tsx`), os administradores cadastram os itens físicos:
*   **Dados Básicos:** Título do produto, descrição detalhada, imagem demonstrativa e preço de venda.
*   **Estoque Físico:** Controle numérico de itens em estoque (`stockQuantity`). A cada reserva confirmada, o estoque é gerenciado para evitar vendas duplicadas.
*   **Ativo/Inativo:** Possibilidade de ocultar produtos esgotados da visualização dos clientes.

### Fluxo de Reservas de Clientes
Os produtos aparecem para os clientes na interface do PWA.
1.  **Seleção e Quantidade:** O cliente seleciona o produto desejado e escolhe a quantidade para reserva.
2.  **Criação de Reserva:** O sistema gera um registro de reserva (`ProductReservation`) com status `PENDING` (Pendente). Os itens são reservados e o estoque correspondente fica temporariamente retido.

### Aprovação e Retirada de Reservas
O administrador gerencia as solicitações dos clientes:
*   **Painel de Pedidos:** Tela para visualizar as reservas do dia, listando o nome do cliente, telefone, produtos, e valor total do pedido.
*   **Mudança de Status:** O atendente altera o status à medida que o pedido avança:
    - `PENDING` (Pendente): Aguardando separação.
    - `CONFIRMED` (Confirmada): Itens separados, aguardando o cliente retirar.
    - `PICKED_UP` (Retirado): Cliente retirou e realizou o pagamento no balcão (baixa definitiva no estoque).
    - `CANCELED` (Cancelada): Pedido cancelado, devolvendo os produtos ao estoque disponível.

---

## 5. Experiência do Cliente (Portal de Agendamento)

A ponta final da plataforma é voltada para uma experiência de usuário premium e otimizada para smartphones no link público `/s/[slug]`.

### Instalação como Web App (PWA)
A página pública do salão funciona como um **PWA (Progressive Web App)**.
*   **Instalação Direta:** O cliente recebe uma notificação ou clica em uma opção no navegador para "Instalar na tela inicial".
*   **Comportamento de App:** O site passa a funcionar como um aplicativo próprio do salão, com ícone personalizado da marca na tela inicial do celular, sem barra de navegação de navegadores, proporcionando carregamento ultra-rápido.

### Fluxo de Agendamento Público
O processo de agendamento online foi otimizado para requerer o menor número de toques possível:
1.  **Escolha de Serviços:** O cliente seleciona um ou mais serviços do catálogo (visualizando preços e tempos de duração).
2.  **Escolha do Profissional:** O cliente escolhe seu profissional de preferência ou a opção "Tanto faz / Qualquer profissional".
3.  **Escolha de Data e Horário:** O sistema exibe de forma clara um calendário com os dias disponíveis e as horas livres da agenda daquele profissional, ocultando automaticamente horários em conflito ou bloqueados.
4.  **Autenticação do Cliente:** Etapa final para novos clientes ou clientes não logados para atrelar a reserva ao cadastro correto.

### Autenticação sem Senha via WhatsApp
Para evitar que os clientes esqueçam senhas ou digitem telefones errados:
*   **Acesso por Código de Verificação:** O cliente insere seu número de celular.
*   **Envio Instantâneo:** O sistema envia um código de segurança de 6 dígitos via WhatsApp para o telefone informado.
*   **Acesso Rápido:** Ao digitar o código recebido, o cliente é autenticado no sistema de forma segura, sem precisar criar ou lembrar de senhas complexas.

### Portal do Cliente (Autogestão de Agendamentos e Benefícios)
No menu `/s/[slug]/portal`, o cliente autenticado tem total autonomia sobre suas interações com o salão:
*   **Meus Agendamentos:** Lista de compromissos futuros e históricos de visitas.
*   **Confirmação de Presença:** O cliente pode clicar para confirmar que irá ao compromisso diretamente de seu painel.
*   **Cancelamento Autônomo:** Permissão para cancelar um compromisso futuro respeitando as regras de horário mínimo de antecedência configuradas pelo salão.
*   **Portal do Clube:**
    - Visualizar plano ativo e status do pagamento.
    - Consultar saldo de benefícios (ex: "Você ainda possui 1 de 2 cortes de cabelo este mês").
    - Assinar planos do clube de forma integrada preenchendo dados de cartão de crédito.
    - Cancelamento de assinatura recorrente diretamente pela plataforma.

---

## 6. Painel do Administrador Geral (Master)

Para os criadores ou operadores da plataforma TratoMarcado, o sistema possui um painel de administração geral localizado em `/master`. Este painel monitora a saúde financeira e operacional de todo o ecossistema multi-tenant.

### Indicadores Globais do SaaS
O dashboard master (`app/master/page.tsx`) reúne métricas em tempo real para a gestão do negócio:
*   **Total de Salões Cadastrados:** Número acumulado de parceiros na plataforma.
*   **Status Financeiro dos Salões:** Distribuição de salões ativos (`ACTIVE`), em período de testes gratuito (`TRIAL`), em atraso de pagamento (`OVERDUE`) ou expirados (`EXPIRED`).
*   **Estatísticas de Uso:** Total de agendamentos agendados nos últimos 30 dias na plataforma e status geral de conexão de instâncias do WhatsApp (quantos salões estão conectados e disparando lembretes com sucesso).

### Gestão de Salões e Planos de Assinatura
Na seção de **Salões**, o administrador master pode:
*   Visualizar a lista detalhada de todos os salões do ecossistema, incluindo data de criação, e-mail de contato do proprietário, e faturamento aproximado.
*   Alterar manualmente o plano contratado pelo inquilino (Tiers: `BÁSICO`, `ESSENCIAL`, `PRO`).
*   Alterar manualmente o status de pagamento (ex: ativar um salão que fez pagamento via transferência bancária direta).
*   Configurar parâmetros personalizados do Asaas para cobrança da própria assinatura do salão.

### Central de Avisos Globais
Ferramenta para enviar avisos de sistema a todos os inquilinos (salões):
*   **Criação de Anúncios:** Permite redigir mensagens de texto informando sobre atualizações, manutenções programadas ou novidades.
*   **Tipos de Alerta:** Categorização visual (`INFO`, `WARNING`, `SUCCESS`) que exibe um banner colorido no topo de todos os painéis administrativos de todos os salões ativos.
