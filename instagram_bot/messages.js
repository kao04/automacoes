const messages = [
    // Original Message
    `Olá.
Seguimos o mesmo perfil de conselhos para casais.
Eu fiz um teste gratuito para saber como estava meu relacionamento e gostei muito do resultado.
Estou indicando para todas as mulheres que se preocupam com seu relaciomento.
Só clicar e fazer gratuitamente.
http://perfeitasintonia.com.br`,

    // Variation 1
    `Oii! Notei que também curte perfis sobre vida a dois.
Fiz um quiz rapidinho sobre relacionamento que achei super válido e resolvi compartilhar.
Ajudou bastante a ter uma visão nova.
É de graça, se quiser tentar:
http://perfeitasintonia.com.br`,

    // Variation 2
    `Olá, tudo bem?
Vi que temos interesse em comum por dicas de relacionamento.
Encontrei um teste gratuito muito bom que dá um feedback legal sobre a vida de casal.
Recomendo demais pra quem quer cuidar da relação.
Link aqui:
http://perfeitasintonia.com.br`,
    
    // Variation 3
    `Oi!
Tô passando pra indicar um teste de relacionamento que fiz e gostei bastante.
É gratuito e ajuda a entender melhor alguns pontos da vida a dois.
Como vi que você segue perfis desse tema, acho que vai curtir.
http://perfeitasintonia.com.br`
];

function getRandomMessage() {
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = { messages, getRandomMessage };
