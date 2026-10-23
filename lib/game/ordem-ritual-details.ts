import type { KnownRitual } from "./types";

// Generated from the table's locally licensed copy of Ordem Paranormal RPG.
export const ORDEM_RITUAL_DETAILS: Record<string, Pick<KnownRitual, "sourcePage" | "details">> = {
  "ritual-alterar-destino": {
    "sourcePage": 134,
    "details": {
      "execution": "reação",
      "range": "pessoal",
      "target": "você",
      "duration": "instantânea",
      "description": [
        "Você vislumbra seu futuro próximo, analisando milhões de possibilidades e escolhendo a melhor. Você recebe +15 em um teste de resistência ou na Defesa contra um ataque.",
        "Verdadeiro (+5 PE): muda o alcance para “curto” e o alvo para “um aliado à sua escolha”."
      ]
    }
  },
  "ritual-alterar-memoria": {
    "sourcePage": 134,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa",
      "duration": "instantânea",
      "resistance": "Vontade anula",
      "description": [
        "Você invade a mente do alvo e altera ou apaga suas memórias de até uma hora atrás. Se escolher alterar as memórias, você pode mudar detalhes de eventos recentes,comoaidentidadedealguémencontradoou oendereçodeumlugarvisitado,masnãoreescrever completamente esses eventos. O alvo recupera suas memórias após 1d4 dias.",
        "Verdadeiro (+4 PE): você pode alterar ou apagar memórias de até 24 horas atrás. Requer 4º círculo."
      ]
    }
  },
  "ritual-amaldicoar-arma": {
    "sourcePage": 134,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 arma corpo a corpo ou pacote de munição",
      "duration": "cena",
      "description": [
        "Quando aprender este ritual, escolha um elemento entre Conhecimento, Energia, Morte e Sangue. Este ritual passa a ser do elemento escolhido. Você imbui a arma ou munições com o elemento, fazendo com que causem +1d6 de dano do tipo do elemento.",
        "Discente(+2PE):mudaobônusdedanopara+2d6. Requer 2º círculo.",
        "Verdadeiro (+5 PE): muda o bônus de dano para +4d6. Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-amaldicoar-tecnologia": {
    "sourcePage": 134,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 acessório ou arma de fogo",
      "duration": "cena",
      "description": [
        "VocêimbuioalvocomEnergia,fazendo-ofuncionar acima de sua capacidade. O item recebe uma modificação a sua escolha.",
        "Discente (+2 PE): muda para duas modificações. Requer 2º círculo.",
        "Verdadeiro (+5 PE): muda para três modificações. Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-ancora-temporal": {
    "sourcePage": 134,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "cena",
      "resistance": "Vontade parcial",
      "description": [
        "Umaauraespiraladasurgesobreoalvo.Noiníciode cadaturnodele,eledevefazerumtestedeVontade.Se falhar,nãopoderásedeslocarnaqueleturno(eleainda pode agir, só não pode se deslocar). Se o alvo passar nesse teste dois turnos seguidos o efeito termina.",
        "Verdadeiro (+4 PE): muda o alvo para “seres a sua escolha”. Requer 4º círculo."
      ]
    }
  },
  "ritual-aprimorar-fisico": {
    "sourcePage": 135,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "cena",
      "description": [
        "O alvo tem seus músculos tonificados e seus ligamentos reforçados, recebendo +1 em Agilidade ou Força, à escolha dele.",
        "Discente (+3 PE): muda o bônus para +2. Requer 3º círculo.",
        "Verdadeiro (+7 PE): muda o bônus para +3. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-aprimorar-mente": {
    "sourcePage": 135,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "cena",
      "description": [
        "O alvo tem sua mente energizada por fagulhos do Conhecimento. Ele recebe +1 em Intelecto ou Presença, à escolha dele (PE, perícias treinadas ou graus de treinamento).",
        "Discente (+3 PE): muda o bônus para +2. Requer 3º círculo.",
        "Verdadeiro (+7 PE): muda o bônus para +3. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-arma-atroz": {
    "sourcePage": 135,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 arma corpo a corpo",
      "duration": "sustentada",
      "description": [
        "Aarmaérecobertaporveiascarmesimepassaaexalar uma aura de violência. Ela fornece +2 em testes de ataque e +1 na margem de ameaça.",
        "Discente (+2 PE): muda o bônus para +5 em testes de ataque. Requer 2º círculo.",
        "Verdadeiro(+5PE):mudaobônuspara+5emtestes de ataque e +2 na margem de ameaça e no multiplicador de crítico. Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-armadura-de-sangue": {
    "sourcePage": 135,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Seusangueescorreparaforadocorpo,cobrindo-osob a forma de uma carapaça que fornece +5 em Defesa. Essebônusécumulativocomoutrosrituais,masnão com bônus fornecido por equipamento.",
        "Discente (+5 PE): muda o efeito para “fornece +10 na Defesa e resistência a balístico, corte, impacto e perfuração 5”. Requer 3º círculo.",
        "Verdadeiro(+9PE):mudaoefeitopara“fornece+15 na Defesa e resistência a balístico, corte, impacto e perfuração 10”. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-canalizar-o-medo": {
    "sourcePage": 135,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa",
      "duration": "permanen te até ser descarregada",
      "description": [
        "Vocêtransferepartedeseupoderparaoutrapessoa. Escolhaumritualdeaté3ºcírculoquevocêconheça; o alvo pode conjurar este ritual em sua forma básica umavez,sempagarseucustoemPE(maspodeusar formas avançadas gastando seus próprios PE para isso). Até o ritual transferido ser conjurado, seus PE máximosdiminuememumvalorigualaocustodele."
      ]
    }
  },
  "ritual-capturar-o-coracao": {
    "sourcePage": 135,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 pessoa",
      "duration": "cena",
      "resistance": "Vontade parcial",
      "description": [
        "Você desperta uma paixão doentia e obcecada por você no alvo, que passa a querar agradá-lo a todo custo, mesmo que para isso precise ficar contra seus amigos. No início de cada turno do alvo ele deve fazer um teste de Vontade. Se falhar, age de forma a ajudá-lonamelhordesuascapacidadesnaqueleturno. Se o alvo passar nesse teste dois turnos seguidos o efeito termina."
      ]
    }
  },
  "ritual-chamas-do-caos": {
    "sourcePage": 136,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "veja texto",
      "duration": "cena",
      "description": [
        "Você manipula o calor e o fogo. Ao conjurar o ritual, escolha um dos seguintes efeitos. Chamejar: o alvo é uma arma corpo a corpo. Ela causa +1d6 pontos de dano de fogo. Esquentar: o alvo é um objeto, que come ça a esquentar. Ele sofre 1d6 pontos de dano de fogo por rodada e causa o mesmo dano a qualquer ser que o esteja empunhando ou vestindo. A cri tério do mestre, o objeto ou o ser pode pegar fogo. Um ser podegastarumaaçãocompletapararesfriaroobjeto (jogan do areia ou jogando-o numa fonte de água próxima, por exemplo) e cancelar o efeito do ritual. Extinguir: o alvo é uma chama de tamanho Grande ou menor, que é apagada. Isso cria uma nuvem de fumaça que ocu pa uma esfera de 3m de raio centrada onde estava a chama. Dentro da fuma ça, seres têm camuflagem leve. Modelar: o alvo é uma chama de tamanho Grande oumenor.Acadarodada,vocêpodegastarumaação livreparamovimentá-la9memqualquerdireção.Se atravessaroespaçoocupadoporumser,elacausa3d6 pontos de dano de fogo nele. Um ser só pode sofrer dano dessa maneira uma vez por rodada.",
        "Discente(+3PE):mudaaduraçãoparasustentadae adiciona “Resistência: Reflexos re duz à metade”. Em vezdonormal,umavezporrodadavocêpodegastar umaaçãodemovimentoparaprojetarumalabareda, num alvo em alcance curto. O alvo sofre 4d6 pontos de dano de Energia (Reflexos reduz à metade).",
        "Verdadeiro (+ 7 PE): como discente, mas muda o dano para 8d6. Requer 3º círculo."
      ]
    }
  },
  "ritual-cicatrizacao": {
    "sourcePage": 136,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "description": [
        "Você acelera o tempo ao redor das feridas do alvo, que cicatrizam instantaneamente. O alvo recupera 3d8+3 PV, mas envelhece 1 ano automaticamente.",
        "Discente (+2 PE): aumenta a cura para 5d8+5 PV. Requer 2º círculo.",
        "Verdadeiro (+9 PE): muda o alcance para “curto”, o alvo para “seres escolhidos” e aumenta a cura para 7d8+7PV.Requer4ºcírculoeafinidadecomMorte."
      ]
    }
  },
  "ritual-cineraria": {
    "sourcePage": 136,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "area": "nuvem de 6m de raio",
      "duration": "cena",
      "description": [
        "Você manifesta uma névoa carregada de essência paranormal.Rituaisconjuradosdentrodanévoatêm sua DT aumentada em +5.",
        "Discente(+2PE):alémdonormal,rituaisconjurados dentro da névoa custam –2 PE.",
        "Verdadeiro (+5 PE): além do normal, rituais conjurados dentro da névoa causam dano maximizado."
      ]
    }
  },
  "ritual-coincidencia-forcada": {
    "sourcePage": 136,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "cena",
      "description": [
        "Você manipula os caminhos do caos para que o alvo tenha mais sorte. O alvo recebe +2 em testes de perícias.",
        "Discente (+2 PE): muda o alvo para aliados à sua escolha. Requer 2º círculo.",
        "Verdadeiro(+5PE):mudaoalvoparaaliadosàsuaescolhaeobônuspara+5.Requer3ºcírculoeafinidade."
      ]
    }
  },
  "ritual-compreensao-paranormal": {
    "sourcePage": 136,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser ou objeto",
      "duration": "cena",
      "resistance": "Vontade anula (veja texto)",
      "description": [
        "Oritualconfereavocêcompreensãosobrenaturalda linguagem.Setocarumobjetocontendoinformação (oulivro,umdispositivocomumagravação…),você entende as palavras mesmo que não conheça seu idioma,contantoquesetratedeumidiomahumano (nãofuncionacomsímbolosousigilosparanormais). Se tocar uma pessoa, pode se comunicar com ela como se falassem um idioma em comum. Se tocar um ser não inteligente, como um animal, pode perceber seus sentimentos básicos, como medo ou felicidade. Um alvo involuntário tem direito a um teste de Vontade.",
        "Discente (+2 PE): muda o alcance para “curto” e o alvopara“alvosescolhidos”.Vocêpodeentendertodos os alvos afeta dos. Requer 2º círculo.",
        "Verdadeiro (+5 PE): muda o alcance para “pessoal” e o alvo para “você”. Em vez do normal, você pode falar, entender e escrever qualquer idioma humano. Requer 3º círculo."
      ]
    }
  },
  "ritual-conhecendo-o-medo": {
    "sourcePage": 137,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa",
      "duration": "instantânea",
      "resistance": "Vontade parcial",
      "description": [
        "Você manifesta medo absoluto na mente do alvo. Se ele falhar no teste de resistência, a Sanidade dele é reduzida a 0 e ele fica enlouquecendo. Se ele passar, sofre 10d6 pontos de dano mental e fica apavorado por 1 rodada. Uma pessoa que fique insana pelo efeito deste ritual se transforma em uma criatura paranormal a critério do mestre."
      ]
    }
  },
  "ritual-consumir-manancial": {
    "sourcePage": 137,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "instantânea",
      "description": [
        "Vocêsugaumapequenaporçãodotempodevidade plantas,insetoseatémesmodosoloaoredor,gerando Lodo e rece bendo 3d6 pontos de vida temporá rios. Os PV temporários desaparecem ao final da cena.",
        "Discente(+2PE):mudaosPVtemporáriosrecebidos para 6d6. Re quer 2º círculo.",
        "Verdadeiro (+5 PE): muda o alvo para “área: esfe ra com 6m de raio centrada em você” e a resistência para “Fortitude reduz à metade”. Em vez do normal, você suga energia de todos os seres vivos na área, causando 3d6 pontos de dano de Morte em cada um e recebendo PV temporários iguais ao dano total causado até o final da cena. Re quer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-contato-paranormal": {
    "sourcePage": 137,
    "details": {
      "execution": "completa",
      "range": "pessoal",
      "target": "você",
      "duration": "1 dia",
      "description": [
        "VocêbarganhacomaentidadedeConhecimentopara que o auxilie durante o dia, em troca de se alimentar de sua Sanidade. Quando o ritual é conjurado, você recebe seis d6. Sempre que fizer um teste de perícia, você pode gastar um desses d6, rolá-lo e adicionar o resultado no teste. No entanto, essa ajuda tem um preço: sempre que rolar um 6 no dado, a entidade toma2pontosdeSanidadedevocê.Sevocêficarsem dados ou chegar a Sanidade 0, o ritual acaba.",
        "Discente(+4PE):mudaosdadosdeauxílioparad8. Semprequerolarum8numdessesdados,aentidade toma 3 pontos de sua Sanidade. Requer 4º círculo.",
        "Verdadeiro (+9 PE): muda os dados de auxílio para d12. Sempre que rolar um 12 num desses dados, a entidade toma 5 pontos de sua Sanidade. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-contencao-fantasmagorica": {
    "sourcePage": 137,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "target": "1 ser",
      "duration": "cena",
      "resistance": "Reflexos anula",
      "description": [
        "Três laços de Energia surgem do chão e se enroscam no alvo, deixando-o agarrado. O alvo pode tentar se li vrar, gastando uma ação padrão para fazer um teste de Atletismo (DT do ritual). Se passar, destrói um laço, mais um laço adicional para cada 5 pontos pelos quais superou a DT. Os laços também podem seratacadosedestruídos:cadaumtemDefesa10,10 PV, RD 5 e imunidade a Energia. Se todos os laços foremdestruídos,oritualédissipado.Porseremfeitos de Energia, os laços afetam cria turas incorpóreas.",
        "Discente (+3 PE): aumenta o número de laços para 6, e você pode escolher o alvo de cada laço, com um mínimo de dois laços por alvo. Requer 3º círculo.",
        "Verdadeiro(+5PE):comodiscente,ecadalaçodestruído libera uma onda de choque que causa 2d6+2 pontosdedanodeEnergianoalvoagarrado.Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-controle-mental": {
    "sourcePage": 138,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "target": "1 pessoa ou animal",
      "duration": "sustentada",
      "resistance": "Vontade parcial",
      "description": [
        "Você domina a mente do alvo, que obedece todos os seus co mandos, exceto ordenssuicidas.Umalvotem direitoaumtestedeVontade no final de cada um de seus turnos para se livrar doefeito.Alvosquepassaremnotesteficampasmos por 1 rodada (apenas uma vez por cena).",
        "Discente(+5PE):mudaoalvoparaatécincopessoas ou animais.",
        "Verdadeiro(+10PE):mudaoalvoparaatédezpessoas ou animais. Requer afinidade com Conhecimento."
      ]
    }
  },
  "ritual-convocacao-instantanea": {
    "sourcePage": 138,
    "details": {
      "execution": "padrão",
      "range": "ilimitado",
      "target": "1 objeto de até 2 espaços",
      "duration": "instantânea",
      "resistance": "Vontade anula",
      "description": [
        "Você invoca um objeto de qualquer lu gar para sua mão. O item deve ter sido previamente preparado com o símbolo do ritual e pode ocupar no máximo 2 espaços. Se o objeto es tiver sendo empunhado por outrapessoa,elapodefazerumtestedeVontadepara negar o efeito, mas você sa berá onde o objeto está e quem o está car regando (ou sua aparência, caso não conheçaapessoa).Poraté1hdepoisdaconvocação, vocêpodegastarumaaçãodemovimentoparaenviar oobjetodevoltaparaolocalemqueeleestavaantes.",
        "Discente (+4 PE): muda o alvo para um objeto de até 10 espaços.",
        "Verdadeiro (+9 PE): muda o alvo para “1 recipiente Médio (como uma mala ou caixote), com itens que somem até 10 espaços” e a duração para “permanente”. Em vez do normal, você encanta o recipiente para mantê-lo escondido no Outro Lado. Você pode convocarorecipienteparaumespaçolivreadjacente, oudevoltaparaoesconderijoparanormal,comuma ação padrão. Para isso, você deve ter em mãos uma miniaturadoobjeto,quefuncionacomoumutensílio decategoriaII.Quandoconjuraestaversãodoritual, você perde 1 PE permanentemente."
      ]
    }
  },
  "ritual-convocar-o-algoz": {
    "sourcePage": 138,
    "details": {
      "execution": "padrão",
      "range": "1,5m",
      "target": "1 pessoa",
      "duration": "sustentada",
      "resistance": "Vontade parcial, Fortitude parcial",
      "description": [
        "Usandoosmedossubconscientesdoalvo,vocêmanipulaaespiraldaMorteparacriarumaimagemdaquilo queelemaisteme.Apenasaprópriavítimavêoalgoz com nitidez; outros seres pre sentes (incluindo você) enxer gam apenas um vulto sombrio. O algoz surge adjacenteavocê.Nofimdecadaturnoseu,eleflutua 12memdireçãoàvítima.Seoalgozterminaroturno emalcancecurtodavítima,eladevefazerumtestede Vontade;sefalhar,ficaráabalada.Seoalgozterminar o turno adja cente à vítima, ela deve fazer um teste de Fortitude. Se falhar, so fre um colapso e fica com 0 PV. Se passar, sofre 6d6 pon tos de dano de Morte (estedanonãopodereduziroalvoamenosde1PV). O algoz persegue o alvo implacavel mente, mesmo além do alcance do ritual. Ele é incorpóreo e imune adanoesódesaparecesedeixaroalvomorrendoou se for dissipado."
      ]
    }
  },
  "ritual-corpo-adaptado": {
    "sourcePage": 138,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa ou animal",
      "duration": "cena",
      "description": [
        "Esteritualmodificaabiologiadoalvoparapermitira sobrevivênciaemambienteshostis.Oalvoficaimune acalorefrioextremos,poderespirarnaáguaserespi rarar(ouvice-versa)enãosufocaemfumaçadensa.",
        "Discente (+2 PE): muda a duração para 1 dia.",
        "Verdadeiro(+5PE):mudaoalcancepara“curto”eo alvo para “pessoas ou animais escolhidos”."
      ]
    }
  },
  "ritual-decadencia": {
    "sourcePage": 139,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "resistance": "Fortitude reduz à metade",
      "description": [
        "Espirais de trevas envolvem sua mão e definham o alvo, que sofre 2d8+2 pontos de dano de Morte.",
        "Discente(+2PE):mudaaresistênciapara“nenhuma” e o dano para 3d8+3. Como parte da execução do ritual, você transfere as espirais para uma arma e faz umataquecorpoacorpocontraoalvocomestaarma. Seacertar,causaodanodaarmaedoritual,somados.",
        "Verdadeiro (+5 PE): muda o alcance para “pessoal” oalvopara“área:explosãocom6mderaio”eodano para8d8+8.Asespiraisafetamtodososseresnaárea. Requer 3º círculo."
      ]
    }
  },
  "ritual-definhar": {
    "sourcePage": 139,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "cena",
      "resistance": "Fortitude parcial",
      "description": [
        "Vocêdisparaumalufadadecinzasquedrenaasforças do alvo. O alvo fica fatigado. Se passar no teste de resistência, em vez disso fica vulnerável.",
        "Discente(+2PE):emvezdonormal,oalvoficaexausto. Sepassarnaresistência,ficafatigado.Requer2ºcírculo.",
        "Verdadeiro (+5 PE): como discente, mas muda o alvo para “até 5 seres”. Requer 3º círculo e afinidade com Morte."
      ]
    }
  },
  "ritual-deflagracao-de-energia": {
    "sourcePage": 139,
    "details": {
      "execution": "completa",
      "range": "pessoal",
      "area": "explosão de 15m de raio",
      "resistance": "Fortitude parcial",
      "description": [
        "Você acumula uma quantidade imensa de Energia, então a libera em uma explosão intensa, como uma estrela em plena terra. Todos na área sofrem 3d10 x 10pontosdedanodeEnergiaetodosositenstecnológicos(armasdefogo,acessórioseutensílios)param defuncionar(emtermosderegras,estãoquebrados). Você não é afetado pela explosão. Alvos que passem no tes te de Fortitude sofrem metade do dano e seus itens voltam a funcionar após 1d4 rodadas.",
        "Verdadeiro(+5PE):afetaapenasalvosasuaescolha."
      ]
    }
  },
  "ritual-desacelerar-impacto": {
    "sourcePage": 139,
    "details": {
      "execution": "reação",
      "range": "curto",
      "target": "1 ser ou objetos somando até 10 espaços",
      "duration": "até chegar ao solo ou cena, o que vier primeiro",
      "description": [
        "O alvo cai lentamente. A velocidade da queda é reduzidapara18mporrodada—osuficienteparanão causardano.Comoconjuraresteritualéumareação, você pode conjurá-lo rápido o bastante para salvar a si ou um aliado de quedas inesperadas. Se o alvo for umprojétil—comoumdisparodearmaouumobjeto largadodoaltodeumprédio—,oritualfazcomque elecausemetadedodanonormal,devidoàlentidão. Este ritual só funciona em alvos em queda livre ou similar; não pode frear um golpe de faca ou o mergulho rasante de um atacante voador.",
        "Verdadeiro (+3 PE): aumenta o total de alvos para seres ou objetos somando até 100 espaços."
      ]
    }
  },
  "ritual-descarnar": {
    "sourcePage": 139,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "resistance": "Fortitude parcial",
      "description": [
        "Esteritualcruelfazcomquelaceraçõessemanifestem na pele e órgãos do alvo, que sofre 6d8 pontos de dano(metadecorte,metadeSangue)eficacomuma hemorragiasevera.Noiníciodecadaturnodele,oalvo deve fazer um teste de Fortitude. Se falhar, sofre 2d8 pontosdedanodeSangue.Sepassarnessetestedois turnosseguidos,ahemorragiaéestancada.Alvosque passemnotestederesistênciainicialsofremmetade do dano e não ficam com hemorragia.",
        "Discente (+3 PE): muda o dano direto para 10d8 e o dano da hemorragia para 4d8. Requer 3º círculo.",
        "Verdadeiro (+7 PE): muda o alvo para você e a du raçãoparasustentada.Enquantooritualdurar,seus ataques corpo a corpo causam 4d8 pontos de dano deSangueadicionaledeixamoalvocomhemorragia automaticamente (como no efeito básico do ritual). O alvo ainda tem direito a um teste de Fortitude no início de seus turnos. Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-deteccao-de-ameacas": {
    "sourcePage": 140,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "area": "esfera de 18m de raio",
      "duration": "cena",
      "description": [
        "Vocêrecebeumapercepçãoaguçadasobreperigosà sua volta. Quando um ser hostil ou armadilha entra na área do efeito, você tem uma sensação de perigo e pode gastar uma ação de movimento para fazer um teste de Percepção (DT 20). Se passar, sabe a direção e distância do perigo.",
        "Discente (+3 PE): além do normal, você não fica desprevenido contra perigos detectados e recebe +5 em testes de resistência contra armadilhas. Requer 3º círculo.",
        "Verdadeiro (+5 PE): muda a duração para “1 dia” e concede os mesmos benefícios de discente. Requer 4º círculo."
      ]
    }
  },
  "ritual-dissipar-ritual": {
    "sourcePage": 140,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "target": "1 ser ou objeto, ou esfera com 3m de raio",
      "duration": "instantânea",
      "description": [
        "Você dissipa rituais ativos, como se a duração deles tivesse acabado. Efeitos de rituais instantâneos não podem ser dissipados (não se pode dissipar uma área de Paradoxo depois que já causou dano…). Faça um teste de Ocultismo; você anula quaisquer rituais ativos no alvo ou na área com DT igual ou menor que o resultado do teste. Você pode conjurar esse ritual em um item amaldiçoado para que se torne um item mundano (perdendo seus poderes) por um dia. Se o item estiver em posse de alguém, seu usuário pode fazer um teste de Vontade para negar o efeito."
      ]
    }
  },
  "ritual-dissonancia-acustica": {
    "sourcePage": 140,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "area": "esfera com 6m de raio",
      "duration": "sustentada",
      "description": [
        "Você manipula a vibração do ar, criando uma área de dissonância sonora. Enquanto estiverem na área, todososseresficamsurdos.Essadissonânciaimpede que seres dentro da área conjurem rituais.",
        "Discente (+1 PE): muda a área para “alvo: 1 ob jeto”. Emvezdonormal,oalvoemanaumaáreadesilêncio com 3m de raio. Se conjurar o ritual num objeto de um ser involuntário, ele tem direito a um teste de Vontade para anulá-lo.",
        "Verdadeiro(+3PE): muda a duração para cena. Em vezdonormal,nenhumsompodedeixaraárea,mas seres dentro da área podem falar, ouvir e conjurar rituais normalmente. Requer 3º círculo."
      ]
    }
  },
  "ritual-distorcao-temporal": {
    "sourcePage": 140,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "veja texto",
      "duration": "veja texto",
      "description": [
        "Este ritual distorce o fluxo de tempo em relação a você,criandoumpequenobolsãotemporalquedura 3 rodadas. Durante este tempo, você pode agir, mas não pode se deslocar do lugar nem interagir com seres e objetos. Da mesma forma, efeitos contínuos não o afetam, e quaisquer efeitos que você iniciar não afetarão a área ao seu redor. Efeitos de área com duraçãomaiorqueesteefeitovãoagirnormalmente quando o bolsão temporal acabar."
      ]
    }
  },
  "ritual-distorcer-aparencia": {
    "sourcePage": 140,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "resistance": "Vontade desacredita",
      "description": [
        "Você modifica sua aparência de modo a parecer outra pessoa. Isso inclui altura, peso, tom de pele, cor de ca belo, timbre de voz, impressão digital, córnea etc. Você recebe +10 em testes de Enganação para disfarce, mas não recebe habilidades da nova forma nem modifica suas demais estatísticas.",
        "Discente (+2 PE): muda o alcance para “curto” e o alvo para “1 ser”. Um alvo in voluntária pode anular o efeito com um teste de Vontade.",
        "Verdadeiro(+5PE):comoemDiscente,masmudao alvo para “seres escolhidos”. Requer 3º círculo."
      ]
    }
  },
  "ritual-eco-espiral": {
    "sourcePage": 141,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "2 rodadas",
      "resistance": "Fortitude reduz à metade",
      "description": [
        "Você manifesta em suas mãos uma pequena cópia do alvo feita de cinzas. No início do próximo turno apósconjuraresteritual,vocêprecisagastarumaação padrãoparaseconcentrarnele;casocontrário,elese dissipa sem efeito. No início do segundo turno, você precisa gastar uma ação padrão para descarregá-lo. Se fizer isso, a cópia explode e o alvo sofre dano de Morte igual a quantidade de dano que sofreu na rodada em que você se concentrou (Fortitude reduz à metade). Se não fizer, o ritual se dissipa sem efeito.",
        "Discente (+3 PE): muda o alvo para “até 5 seres”.",
        "Verdadeiro (+7 PE): muda a duração para “até 3 rodadas”,permitindoquevocêseconcentrenasduas primeirasedescarreguenaterceira.Requer4ºcírculo e afinidade."
      ]
    }
  },
  "ritual-eletrocussao": {
    "sourcePage": 141,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser ou objeto",
      "duration": "instantânea",
      "resistance": "Fortitude parcial",
      "description": [
        "Vocêmanifestaedisparaumacorrenteelétricacontra o alvo, que sofre 3d6 pontos de dano de eletricidade e fica vulnerável por uma rodada. Se passar no teste de resistência, sofre apenas me tade do dano e evita acondição.Seusadocontraobjetoseletrônicos,este ritual causa o dobro de dano e ignora resistência.",
        "Discente (+2 PE): muda o alvo para “área: linha de 30m”. Você dispara um poderoso raio que causa 6d6 pontosdedanodeEnergiaemtodosossereseobjetos li vres na área. Requer 2º círculo.",
        "Verdadeiro (+5 PE): muda o alvo para “alvos escolhidos”. Em vez do normal, você dispara vários relâmpagos, um para cada alvo escolhido, causando 8d6 pontos de dano de Energia em cada. Requer 3º círculo."
      ]
    }
  },
  "ritual-embaralhar": {
    "sourcePage": 141,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Vocêcriatrêscópiasilusóriassuas,comohologramas extremamenterealistas.Ascópiasficamaoseuredor eimitamsuasações,tornandodifícilparauminimigo saberqueméoverdadeiro.Vocêrecebe+6naDefesa. Cada vez que um ataque contra você erra, uma das imagensdesapareceeobônusnaDefesadiminuiem 2. Um oponente deve ver as cópias para ser confundido.Sevocêestiverinvisível,ouoatacantefecharos olhos,vocênãorecebeobônus(masoatacantesofre as penalida des normais por não enxergar).",
        "Discente (+2 PE): muda o número de cópias para 5 (e o bônus na Defesa para +10). Requer 2º círculo.",
        "Verdadeiro (+5 PE): muda o número de cópias para 8 (e o bônus na Defesa para +16). Além do normal, todavezqueumacópiaédestruída,emiteumclarão de luz. O ser que destruiu a cópia fica ofuscado por uma rodada. Requer 3º círculo."
      ]
    }
  },
  "ritual-enfeiticar": {
    "sourcePage": 141,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 pessoa",
      "duration": "cena",
      "resistance": "Vontade anula",
      "description": [
        "Esteritualtornaoalvoprestativo(vejaapágina45).Ele nãoficasobseucontrole,maspercebesuaspalavrase açõesdamaneiramaisfavorávelpossível.Vocêrecebe um bônus de +10 em tes tes de Diplomacia com ele. Um alvo hostil ou que esteja envolvido em combate recebe+5emseutestederesistência.Sevocêouseus aliadostomaremqualqueraçãohostilcontraoalvo,o efeitoédissipadoeoalvoretornaàatitudequetinha antes (ou piora da, de acordo com o mestre).",
        "Discente (+2 PE): em vez do normal, você suge re uma ação para o alvo e ele obede ce. A sugestão deve ser feita de modo que pareça aceitável, a critério do mestre.Pedirqueoalvoatireemseucompanheiro,por exemplo, dissipa o efeito. Já sugerir a um guarda que descanseumpouco,demodoquevocêeseusaliados passem por ele, é aceitável. Quando o alvo executa a ação, o efeito termina. Você pode determinar uma condiçãoespecíficaparaasugestão:porexemplo,que o policial prenda a próxima pessoa de casaco verde que ele encontrar. Requer 2º círculo.",
        "Verdadeiro (+5 PE): afeta todos os alvos dentro do alcance. Requer 3º círculo."
      ]
    }
  },
  "ritual-esconder-dos-olhos": {
    "sourcePage": 142,
    "details": {
      "execution": "livre",
      "range": "pessoal",
      "target": "você",
      "duration": "1 rodada",
      "description": [
        "Você fica invisível, incluindo seu equipamento, recebendo camufla gem total e +15 em testes de Furtividade. Como o normal, seres que não possam vê-lo ficam desprevenidos contra seus ataques. O efeito termina se você faz um ata que ou usa uma habilidade hostil. Ações contra objetos livres não dissipam Esconder dos Olhos (você pode tocar ou apanhar objetos que não estejam sendo segurados poroutrosseres).Causardanoindiretamente—por exem plo, preparar explosivos para detonar mais tarde — não é considerado um ataque. Objetossoltosvoltamaservisíveiseobjetosapanhadosporvocêficaminvisíveis.Luztransportadanunca ficainvisível(mesmoquesuafonteesteja).Qualquer parte de um item carregado que se estenda além de seu alcance corpo a corpo na tural se torna visível.",
        "Discente(+3PE):mudaaduraçãopara“sustentada”. Em vez do normal, você gera uma esfera de invisibilidade. Você e todos os aliados a até 3m de você se tornam invisíveis, como no efeito normal do ritual (ainda ficam visíveis caso façam uma ação hostil). A esfera se move junto com você; qualquer coi sa que saia da esfera fica visível. Re quer 3º círculo.",
        "Verdadeiro (+7 PE): muda a execução para “ação pa drão”, o alcance para “toque”, o alvo para “1 ser” e aduraçãopara“sustentada”.Oefeitonãoédissipado caso o alvo faça um ataque ou ação hostil. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-espirais-da-perdicao": {
    "sourcePage": 142,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "cena",
      "description": [
        "Espiraissurgemnocorpodoalvo,tornandoseusmovimentoslentos.Oalvosofre–O emtestesdeataque.",
        "Discente (+2 PE): muda a penalidade para –OO. Requer 2º círculo.",
        "Verdadeiro (+8 PE): muda a penalidade para –OO. e o alvo para “seres escolhidos”. Requer 3º círculo."
      ]
    }
  },
  "ritual-ferver-sangue": {
    "sourcePage": 142,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "sustentada",
      "resistance": "Fortitude parcial",
      "description": [
        "O sangue do alvo aquece até entrar em ebulição. Quando o ritual é conjurado, e no início de cada turno do alvo, ele deve fazer um teste de Fortitude. Se falhar, sofre 4d8 pontos de dano de Sangue e fica fraco;sepassar,sofremetadedodanoenãoficafraco nestarodada.Seoalvopassarnessetestedoisturnos seguidos o efeito termina.",
        "Verdadeiro (+4 PE): muda o alvo para “seres escolhidos”. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-fim-inevitavel": {
    "sourcePage": 142,
    "details": {
      "execution": "completa",
      "range": "extremo",
      "effect": "buraco negro com 1,5m de diâmetro",
      "duration": "4 ro dadas",
      "resistance": "Fortitude parcial",
      "description": [
        "Você cria um vácuo em um espaço desocupado a sua escolha. No início de cada um de seus quatro turnos seguintes, todos os seres a até 90m do vácuo, incluin do você, devem fazer um teste de For titude. Em caso de falha, ficam caídas e são puxadas 30m nadireçãodovácuo.Objetossoltostambémsãopuxados. Seres podem gastar uma ação de movimento para se segurar em algum objeto fixo, recebendo +5 em seus tes tes de resistência. Seres e objetos que iniciemseuturnotocandoovácuotemporalsofrem 100 pontos de dano de Morte por rodada.",
        "Discente(+5PE):mudaaduraçãopara“5rodadas”eo efeitoparaquevocênãosejaafetado.Requerafinidade.",
        "Verdadeiro(+10PE):mudaaduraçãopara“6rodadas” eoefeitoparaqueseresescolhidosdentrodoalcance não sejam afetados. Requer afinidade."
      ]
    }
  },
  "ritual-flagelo-de-sangue": {
    "sourcePage": 143,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa",
      "duration": "cena",
      "resistance": "Fortitude parcial",
      "description": [
        "Você toca uma pessoa, gravando uma marca escarificada no corpo dela enquanto profere uma ordem, como“nãoataqueamimoumeusaliados”,“siga-me” ou “não saia desta sala”. A cada rodada que o alvo desobedecer a ordem, a marca inflige uma dor excruciante,quecausa10d6pontosdedanodeSangue e deixa o alvo enjoado pela rodada (Fortitude reduz o dano à metade e evita a condição). Seoalvopassar nessetestedoisturnosseguidosamarcadesaparece.",
        "Discente (+3 PE): muda o alvo para “1 ser (exceto criaturas de Sangue)”. Requer 3º círculo.",
        "Verdadeiro(+7PE):comoDiscente,emudaaduração para “1 dia”. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-forma-monstruosa": {
    "sourcePage": 143,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Seucorposetransforma,assumindoumaformaque combinasuascaracterísticascomasdeumacriatura de Sangue; suas roupas e proteção se mesclam à sua carne,transformando-seemumacouraça,equaisquer objetos em suas mãos se fundem aos seus braços, transformando-seemgarraspontiagudas.Seuequipamentoficainacessível,masseusbônussemantém. SeutamanhomudaparaGrandeevocêrecebe+5em testesdeataqueerolagensdedanocorpoacorpoe30 PVtemporários.Enquantoestivertransformado,sua mente é tomada por fúria selvagem; você não pode falarnemconjurarrituaiseacadarodadadeveatacar o ser mais próximo possível. Se não houver um ser que possa atacar, deve se deslocar em direção ao ser maispróximodamelhorformapossível.Seosermais próximo for um aliado, você pode fazer um teste de Vontade (DT do ritual). Se passar, neste turno você pode escolher qual ser atacar.",
        "Discente (+3 PE): além do normal, você recebe imunidade a atordoamento, fadiga, san gramento, sono e veneno.",
        "Verdadeiro(+9PE):mudaosbônusemtestesdeataqueerolagensdedanopara+10eosPVtemporários para 50. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-fortalecimento-sensorial": {
    "sourcePage": 143,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Você potencializa seus sentidos, recebendo +O em Investigação, Luta, Percepção e Pontaria.",
        "Discente(+2PE):alémdonormal,seusinimigossofrem –Oemtestesdeataquecontravocê.Requer2ºcírculo.",
        "Verdadeiro(+5PE):alémdonormal,vocêapuraseus sentidos para perceber perigo. Você fica imune às condiçõessurpreendidoedesprevenidoerecebe+10 em Defesa e Reflexos. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-hemofagia": {
    "sourcePage": 143,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "resistance": "Fortitude reduz à metade",
      "description": [
        "Você arranca o sangue do corpo do alvo através da pele dele, causando 6d6 pontos de dano de Sangue. Vocêentãoabsorveessesangue,recuperandopontos de vida iguais à metade do dano causado.",
        "Discente (+3 PE): muda a resistência para “nenhuma”. Como parte da execução do ritual, você faz um ataquecorpoacorpocontraoalvo.Seacertar,causa o dano do ataque e do ritual, recuperando PV em quantidade igual à metade do dano total causado.",
        "Verdadeiro (+7 PE): muda o alcance para “pessoal”, oalvopara“você”eaduraçãopara“cena”.Emvezdo normal, a cada rodada você pode gastar uma ação padrão para to car 1 ser e causar 4d6 pontos de dano deSangue.VocêrecuperaPViguaisàmetadedodano causado. Re quer 4º círculo."
      ]
    }
  },
  "ritual-inexistir": {
    "sourcePage": 144,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "resistance": "Vontade parcial",
      "description": [
        "Esteéumritualextremamentecruel,quejácondenou grandes agentes da Ordem ao oblívio. Você toca o alvo com a intenção de apagá-lo por completo da existência,fazendoamenteeocorpodoalvoserem reescritosedesmanteladosdaexistência.Oalvocomeçaalevitarapoucoscentímetrosdochãoetextos narrando todos os momentos de sua vida surgem e brilham por cima de sua pele, até que a existência dele começa a ser destruída de dentro, causando 10d12+10 pontos de dano de Conhecimento. Se o alvopassarnotestederesistência,emvezdissosofre 2d12pontosdedanoeficadebilitadoporumarodada. Independente do resultado do teste de resistência, se os PV do alvo forem reduzidos a 0 ou menos, ele serácompletamenteapagado,nãorestandonenhum traço de sua existência.",
        "Discente (+5 PE): muda o dano para 15d12+15 e o dano resistido para 3d12.",
        "Verdadeiro(+10PE):mudaodanopara20d12+20e o dano resistido para 4d12. Requer afinidade."
      ]
    }
  },
  "ritual-invadir-mente": {
    "sourcePage": 144,
    "details": {
      "execution": "padrão",
      "range": "médio ou toque",
      "target": "1 ser ou 2 pessoas voluntárias",
      "duration": "instantânea ou 1 dia",
      "resistance": "Vontade parcial ou nenhuma",
      "description": [
        "Quandoconjuraesteritual, você gera um dos efeitos a seguir, a sua escolha: rajada mental (usa os primeiros parâmetros do cabeçalho acima) ou ligação telepática (usa os segundos parâmetros). Rajada Mental: você infecta a mente do alvo com o ConhecimentoproibidodoOutroLado,dilacerando o cérebro dele. O alvo sofre 6d6 pontos de dano de Conhecimento e fica atordoado por uma rodada. Se passar no teste de Vontade, sofre metade do dano e não fica atordoado. Um mesmo alvo só pode ficar atordoado por este ritual uma vez por cena. Ligação Telepática: você cria um elo mental entre duas pessoas (você pode ser uma delas), que podem secomunicarindependentedadistânciapeladuração do ritual (1 dia).",
        "Discente(+3PE):seescolharrajadamental,aumenta o dano para 10d6. Se escolher ligação telepática, em vez do normal, você cria um elo mental que permite que você gaste uma ação de movimento para ver e ouvir pelos sentidos do alvo. Um alvo involuntário podefazerumtestedeVontadeparasuprimiroritual por uma hora. Requer 3º círculo.",
        "Verdadeiro (+7 PE): se escolher rajada mental, aumenta o dano para 10d6 e muda o alvo para “seres escolhidos”. Se escolher ligação telepática, você pode criar um vínculo mental entre até 5 pessoas. Requer 4º círculo."
      ]
    }
  },
  "ritual-involucro-de-carne": {
    "sourcePage": 144,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "effect": "1 clone seu",
      "duration": "cena",
      "description": [
        "Vocêmanifestaumapoçadesanguenochão,deonde emerge uma cópia sua. Ela é idêntica em aparência e capacidades (em termos de jogo, tem as mesmas estatísticas) e surge com uma cópia de todo equipamentomundanoquevocêestivercarregando.Acópia não tem consciência (valor de Intelecto e Presença nulos) e não age sem que você dê uma ordem. Você pode gastar uma ação de movimento para dar uma ordemàcópia,como“lutecontraaqueleser”.Nofinal de cada um de seus turnos, a cópia segue a ordem da melhor maneira possível, mas ainda é incapaz de tomar decisões sozinha e acatará qualquer ordem perigosasemhesitar,mesmoqueleveàsuadestruição. Alternativamente, no início de seu turno, você pode controlarativamenteacópia.Sefizerisso,vocêentra numtransetemporárioeassumeocontroledacópia como se fosse seu corpo, usando os sentidos dela. Qualquer ser que interagir com a cópia tem direito aumtestedePercepção(DTdoritual)paraperceber que é uma cópia. A cópia se desfaz em uma poça de sanguecoaguladosechegara0PVousairdoalcance."
      ]
    }
  },
  "ritual-lamina-do-medo": {
    "sourcePage": 145,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "resistance": "Fortitude parcial",
      "description": [
        "Vocêmanifestaumalâminaimpossível,quepodeser descritaapenascomouma“fendanaRealidade”,com a qual golpeia um alvo adjacente. Se o alvo falhar no testedeFortitude,seusPVsãoreduzidosa0eelefica morrendo; se passar, sofre 10d8 pontos de dano de Medo (ignora todas as resistências) e fica apavorado porumarodada.Seumapessoaficarmorrendopela Lâmina do Medo e sobreviver, o ferimento causado pelo ritual passa a se transformar constantemente, jamaiscicatrizandoefazendocomqueapessoapasse aviveremdorconstante.Aprenderesteritualrequer um poder de trilha específico."
      ]
    }
  },
  "ritual-localizacao": {
    "sourcePage": 145,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "area": "círculo com 90m de raio",
      "duration": "cena",
      "description": [
        "Este ritual pode encontrar uma pessoa ou objeto a sua escolha. Você pode pensar em termos gerais (“um policial”, “algo de metal”) ou específicos (“A delegada Joana”, “uma pistola”). O ritual indica a direção e distân cia da pessoa ou objeto mais próxi mo desse tipo, caso esteja ao alcance. Você pode movimentar-separacontinuarprocurando.Procurar algo mui to específico (“a chave do armazém 4 no porto”)exigequevocêtenhaemmenteumaimagem preci sa do objeto; caso a imagem não seja parecida com a verdade, o ritual fa lha, mas você gasta os PE mesmo as sim. Este ritual pode ser bloqueado por uma fina camada de chumbo.",
        "Discente (+3 PE): muda o alcance para “toque”, o alvo para “1 pessoa” e a duração para “1 hora”. Em vez do nor mal, a pessoa tocada descobre o ca minho mais direto para entrar ou sair de um lugar. Assim, o ritual pode ser usado para descobrir a rota até o relicáriodeumacatedralouasaídamaispróximade uma caverna (mas não para encontrar a localização deumapessoaouobjeto;funcionaapenasemrelação a lugares). Caso a pessoa demore mais de uma hora parapercorrerocaminho,oconhecimentoseperde.",
        "Verdadeiro (+7 PE): aumenta a área para círculo de 1km de raio. Requer 4º círculo."
      ]
    }
  },
  "ritual-luz": {
    "sourcePage": 142,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 objeto",
      "duration": "cena",
      "resistance": "Vontade anula (veja texto)",
      "description": [
        "Oalvoemiteluzdecoresalternadasebrilhantes(mas não produz ca lor) em uma área com 9m de raio. O objetopodeserguardado(emumbolso,porexemplo) para interromper a luz, que voltará a funcionar caso o ob jeto seja revelado. Se o alvo for um objeto em posse de uma pessoa involuntá ria, ela tem direito a um teste de Von tade para anular o efeito.",
        "Discente (+2 PE): muda o alcance para longo e o efeitopara4esferasbrilhantes.Criaesferasflutuan tes de pura luz com 10cm de diâmetro, que você podeposicionarondequiserdentrodoalcance.Você pode enviar uma esfera à frente, outra para trás, outra para cima e manter uma perto de você, por exemplo. Uma vez por ro dada, você pode mover as esferascomumaaçãolivre.Cadaesferailuminauma área de 6m de raio, mas não produz ca lor. Se uma esfera ocupar o espaço de um ser, ele fica ofuscada e sua si lhueta pode ser vista claramente (ela não recebecamuflagemporescuridãoouinvisibilidade). Requer 2º círculo.",
        "Verdadeiro (+5 PE): a luz é cálida como a do sol. Dentro da área seus aliados recebem +O em testes deVontade,eseusinimigosficamofuscados.Requer 3º círculo."
      ]
    }
  },
  "ritual-medo-tangivel": {
    "sourcePage": 145,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Oritualtransformaseucorpoemumamanifestação doMedo,tornando-oimuneaefeitosmundanos.Você fica imune às con dições atordoado, cego, debilitado, enjoado,envenenado,exausto,fatigado,fraco,lento, ofuscado e paralisado, além de doenças e venenos, e nãosofredanoadicionalporacertoscríticoseataques furti vos. Além disso, dano do tipo balístico, corte, impactoouperfuraçãonãopodemreduzirseutotalde pontosdevidaabaixode1,tornando-ovirtualmente imortal contra efeitos mundanos."
      ]
    }
  },
  "ritual-mergulho-mental": {
    "sourcePage": 146,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa",
      "duration": "sustentada",
      "resistance": "Vontade parcial (veja texto)",
      "description": [
        "Vocêmergulhanospensamentosdoalvoparadescobririnformaçõessobreele.Duranteomergulho,você fica desprevenido. No início de cada turno seu que estiversustentandooefeitoetocandooalvo,eledeve fazerumtestedeVontade.Sefalhar,deveresponder uma pergunta sua que possa ser respondida com “sim” ou “não”, sendo incapaz de mentir. O que você desco bre depende das suas perguntas e do mestre: talvezvocênãodescubratudoqueháparasaber,mas pode ganhar pistas para continuar a investi gação.",
        "Verdadeiro (+4 PE): muda a execução para 1 dia, o alcanceparailimitadoeadicionacomocomponente ritualístico uma cuba de ouro cheia d’água e uma máscara(acessóriodecategoriaII).Vocêpoderealizaromergulhomentalàdistância,submergindoseu rostomascaradonaáguaenquantomentalizaoalvo. Paraqueesseritualfuncione,vocêprecisateralguma informação sobre o alvo, como nome completo, e um objeto pessoal ou fotografia. Requer 4º círculo."
      ]
    }
  },
  "ritual-miasma-entropico": {
    "sourcePage": 146,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "area": "nuvem com 6m de raio",
      "duration": "instantânea",
      "resistance": "Forti tude parcial (veja texto)",
      "description": [
        "Cria uma explosão de emanações tóxicas. Seres na área sofrem 4d8 pontos de dano químico e ficam enjoados por 1 rodada. Se passarem na resistên cia, sofrem metade do dano e não fi cam enjoados.",
        "Discente (+3 PE): muda o dano para 6d8 de Morte.",
        "Verdadeiro(+7PE):comoaversãodiscente,masmudaa duraçãopara3rodadas.Umserqueinicieseuturnodentrodaáreasofreodanonovamente.Requer3ºcírculo."
      ]
    }
  },
  "ritual-nuvem-de-cinzas": {
    "sourcePage": 146,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "effect": "nuvem com 6m de raio e 6m de altura",
      "duration": "cena",
      "description": [
        "Umanuvemdefuligemespessaeleva-sedeumponto asuaescolha,obscurecendotodaavisão—seresaaté 1,5mtêmcamuflagemleveeseresapartirde3mtêm camuflagem total. Um vento forte dispersa a nuvem em4rodadaseumvendavaladispersaem1rodada. A nuvem não funciona sob a água.",
        "Discente(+2PE):vocêpodeescolherseresnoalcance ao conjurar o ritual; eles enxergam através do efeito. Requer 2º círculo.",
        "Verdadeiro (+5 PE): além do normal, a nuvem fica espessa, quase sólida. Qualquer ser dentro dela tem seu deslocamento reduzido para 3m (independente deseudeslocamentonormal)esofre–2emtestesde ataque. Requer 3º círculo."
      ]
    }
  },
  "ritual-odio-incontrolavel": {
    "sourcePage": 146,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 pessoa",
      "duration": "cena",
      "description": [
        "Oalvoentraemumfrenesi,aumentandosuaagressividadeecapacidadedeluta.Elerecebe+2emtestesde ataqueerolagensdedanocorpoacorpoeresistência a balístico, corte, impacto e perfuração 5. Enquanto o efeito durar, o alvo não pode fazer nenhuma ação queexigecalmaeconcentração(comousaraperícia Furtividadeouconjurarrituais),edevesempreatacar um alvo em sua rodada, mesmo que seja um aliado se ele for o único a seu alcance.",
        "Discente (+2 PE): além do normal, sempre que o alvousaraaçãoagredir,podefazerumataquecorpo a corpo adicional contra o mesmo alvo.",
        "Verdadeiro(+5PE):mudaobônusdeataqueedano para +5 e o alvo passa a sofrer apenas metade do danodostiposbalístico,corte,impactoeperfuração. Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-ouvir-os-sussurros": {
    "sourcePage": 147,
    "details": {
      "execution": "completa",
      "range": "pessoal",
      "target": "você",
      "duration": "instantânea",
      "description": [
        "O ritual conecta você com os sussurros, memórias ecoadas pelo Outro Lado, que você pode consultar parareceberconhecimentoproibidoemrelaçãoauma ação que tomará em breve. Ao usar este ritual, faça umaperguntasobreumeventoquevocêestáprestes a fazer (na mesma cena) que possa ser respondida com “sim” ou “não”. O mestre rola 1d6 em segre do; com um resultado de 2 a 6, o ritual funciona e você recebe sua resposta, que pode ser “sim”, “não” ou “sim e não”. Com um resultado 1, o ritual falha e oferece o resultado “não”. Não há como saber se esse resultado foi dado porque o ritual falhou ou não. Lan çar este ritual múltiplas vezes sobre o mesmo assunto gera sempre o pri meiro resultado. Porexemplo,vocêestáprestesaentraremumprédio que pode ser o esconderijo de um cultista. Se você perguntar para os sussurros se o cultista está mesmo nesse local, a resposta pode ser “sim” (ele está no prédio), “não” (ele não está no prédio) ou “sim e não” (ele está no prédio, mas usou um ritual para se esconder seu corpo físico em uma dimensão do Outro Lado…). Isso é útil para saber se você deve (ou não) gastar recursos para um possível combate.",
        "Discente(+2PE):mudaaexecuçãopara1minuto.Em vez do normal, você pode con sultar os ecos fazendo uma pergunta sobre um evento que poderá acontecer até um dia no futuro. O mestre rola a chance de falha; com um resul tado de 2 a 6, você recebe uma resposta,desdeumasimplesfraseatéumaprofeciaou enigma. Em geral, este uso oferece pistas, indicando um caminho a tomar para descobrir a resposta que se procura. Numa falha você não recebe resposta alguma. Re quer 2º círculo.",
        "Verdadeiro (+5 PE): muda a execução para 10 mi nutoseaduraçãopara5rodadas.Emvezdonormal, você consulta os ecos, podendo fazer uma pergun ta por rodada, desde que ela possa ser respondida com “sim”, “não” ou “ninguém sabe”. O mestre rola a chance de falha para cada pergunta. Em caso de falha, a resposta também é “ninguém sabe”. Requer 3º círculo."
      ]
    }
  },
  "ritual-paradoxo": {
    "sourcePage": 140,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "area": "esfera com 6m de raio",
      "duration": "instantânea",
      "resistance": "Fortitude reduz à metade",
      "description": [
        "O ritual cria uma poderosa implosão de distorção temporalcontraditória,causando6d6pontosdedano de Morte em todos os seres na área.",
        "Discente(+3PE): muda a área para efeito: esfera de 1,5 m de diâmetro e a duração para cena. Em vez do normal, cria uma esfera de emanações espirais sibilantes com 1,5m de diâmetro que causa 4d6 pontos de dano de Morte a qualquer ser no mesmo espaço. Você pode gastar uma ação de movimento para fazer a esfe ra voar 9m em qualquer direção. Um ser só pode sofrer dano da esfera uma vez por rodada.",
        "Verdadeiro (+7 PE): muda o dano para 13d6. Seres reduzidos a 0 PV pelo dano do Paradoxo devem fazer um teste de Fortitude. Se falharem, são reduzidos a cinzas (morrem imediatamente). Requer 4º círculo."
      ]
    }
  },
  "ritual-perturbacao": {
    "sourcePage": 147,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 pessoa",
      "duration": "1 rodada",
      "resistance": "Vontade anula",
      "description": [
        "Vocêdáumaordemqueoalvodevesercapazdeouvir (mas não precisa entender). Se falhar na resistência, ele deve obedecer à ordem em seu próprio turno da melhor maneira possível. Escolha um dos efeitos. Fuja: O alvo gasta seu turno tentando se afastar de você (usando todas as suas ações). Largue: O alvo solta quaisquer itens que esteja segurando e não pode pegá-los de volta até o início de seu próximo turno. Como esta é uma ação livre, ele ainda pode executar outras ações (exceto pegar aquilo que largou). Pare: O alvo fica pasmo (não pode realizar ações, só reações). Sente-se:Comumaaçãolivre,oalvosesentanochão (se estava pendurado ou voando, desce até o chão). Ele pode fazer outras ações, mas não se levantar até o início de seu próximo turno. Venha: O alvo gasta seu turno se aproximando de você (usando todas as suas ações).",
        "Discente(+2PE):mudaoalvopara“1ser”eadiciona o seguinte comando: “Sofra. O alvo é acometido de dor aguda. Ele sofre 3d8 pontos de dano de Conhecimento e fica abalado por uma rodada”.",
        "Verdadeiro(+5PE):mudaoalvopara“até5seres”ou adiciona o seguinte comando: “Ataque. O alvo deve fazeraaçãoagredircontraumoutroalvoasuaescolha em alcance médio, com todas as suas capacidades”. Requer 3º círculo e afinidade."
      ]
    }
  },
  "ritual-poeira-da-podridao": {
    "sourcePage": 148,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "area": "nuvem com 6m de raio",
      "duration": "sustentada",
      "resistance": "Fortitude (veja texto)",
      "description": [
        "Vocêmanifestaumanuvemdepoeiraqueapodreceos seresnaárea.Aoconjuraroritual,enoiníciodecada umdeseusturnos,sereseobjetosnaáreasofrem4d8 pontosdedanodeMorte(Fortitudereduzàmetade). Alvos que fa lharem no teste também não podem recuperar PV de nenhuma forma por uma rodada.",
        "Verdadeiro (+4 PE): muda o dano para 4d8+16."
      ]
    }
  },
  "ritual-polarizacao-caotica": {
    "sourcePage": 148,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "você",
      "duration": "sustentada",
      "resistance": "Vontade anula",
      "description": [
        "Vocêgeraumaauramagnéticasobrenatural.Escolha um dos efeitos a seguir. Atrair:vocêpodeusarumaaçãodemovimentopara puxar um objeto metálico de espaço 2 ou menor dentro do alcance. Se o objeto estiver livre, voa para suas mãos (caso tenha mãos livres para apanhá-lo) ou para seus pés. Repelir: você repele objetos de espaço 2 ou menor (o que envolve quase todos os projéteis e armas de arremesso), recebendo resistência a balístico, corte, impacto e perfuração 5.",
        "Discente(+2PE):mudaaduraçãoparainstantânea. nesta versão a energia magnética é expelida de uma única vez e arremessa até 10 objetos, ou um total de 10espaços,oqueformenor.Osobjetosdevemestara até3munsdosoutros.Objetosarremessadospodem atin gir seres em seu caminho, causan do de 1 ponto de dano de impacto por espaço (objetos macios, sem pontas ou sem fio) até 1d6 pontos de dano por espaço (objetos duros, pontudos ou afia dos). Seres atingidos têm direito a um teste de Reflexos para reduzirodanoàmetade.Seresdentrodacapacidade decargadoefeitopodemserarremessados,mastêm direitoaumtestedeVontadeparaevitaroefeito(em si mesmos ou em objetos que estejam seguran do). Um ser arremessado contra uma superfície sólida sofre 1d6 pon tos de dano de impacto para cada 3m que“voou”nodeslocamento(incluindooutrosseres; nesse caso, ambos sofrem o dano).",
        "Verdadeiro (+5 PE): muda o alcance para médio e a duração para instantânea. Você pode usar uma ação demovimentoparafazercomqueaforçamagnética leviteemovaumserouobjetodeespaço10oumenor por até 9m em qualquer direção dentro do alcance. Um ser pode anular o efeito sobre ele, ou sobre um objetoquepossua,passandonumtestedeVontade.O alvocainochãosesairdoalcanceouoefeitoterminar."
      ]
    }
  },
  "ritual-possessao": {
    "sourcePage": 148,
    "details": {
      "execution": "padrão",
      "range": "longo",
      "target": "1 pessoa viva ou morta",
      "duration": "1 dia",
      "resistance": "Vontade anula",
      "description": [
        "Vocêprojetasuaconsciêncianocorpodeumapessoa vivaoumorta.Enquantopossuiroalvo,vocêassume o controle total do corpo dele (se o alvo estiver vivo, a consciência dele troca de lugar com a sua, ficando inerte dentro do seu corpo desacordado). Em termos de jogo, você continua usando a sua ficha, mas com os atributos físicos (Agilidade, Força e Vigor) e deslocamento do alvo. Se o alvo passar no teste de resistência, sabe que você tentou possuí-lo e fica imune a este ritual por um dia. Caso qualquer um dosenvolvidosnoritualmorra,amentesobrevivente ficará permanentemente presa no corpo novo, a não ser que use o ritual outra vez para voltar a seu corpo antigo. Retornar para o seu corpo voluntariamente é uma ação livre."
      ]
    }
  },
  "ritual-presenca-do-medo": {
    "sourcePage": 149,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "area": "emanação de 9m de raio",
      "duration": "sustentada",
      "description": [
        "Você se torna um receptáculo para o Medo puro, emanando ondas de pavor e ruína. Alvos dentro da áreanomomentodaconjuraçãoounoiníciodecada um de seus turnos são acometidos por sofrimento intenso e sofrem 5d8 de dano mental e 5d8 de dano deMedo(Vontadereduzambosàmetade).Alvosque falharem no teste ficam atordoados por uma rodada (este efeito funciona apenas uma vez por cena)."
      ]
    }
  },
  "ritual-protecao-contra-rituais": {
    "sourcePage": 149,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "cena",
      "description": [
        "Você canaliza uma aura de Medo puro, que protege o alvo contra efeitos paranormais. O alvo recebe resistência a dano paranormal 5 e +5 em testes de resistência contra rituais e habilidades de criaturas paranormais.",
        "Discente (+3 PE): muda o alvo para até 5 seres tocados. Re quer 3º círculo.",
        "Verdadeiro(+6 PE): muda o alvo para até 5 seres tocados, a resistência a dano para 10 e o bônus em testes de resistência para +10. Re quer 4º círculo."
      ]
    }
  },
  "ritual-purgatorio": {
    "sourcePage": 149,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "área de 6m de raio",
      "duration": "sustentada",
      "resistance": "Fortitude parcial",
      "description": [
        "Vocêfazbrotarumapoçadesanguepegajosonaárea afetada. Inimigos na área se tornam vulneráveis a danobalístico,decorte,deimpactoedeperfuração. Um alvo que tente sair da área é acometido de uma dor terrível; sofre 6d6 pontos de dano de Sangue e deve fazer um teste de Fortitude. Se passar, consegue sair. Se falhar, a dor faz com que não consiga se mover e perca a ação de movimento."
      ]
    }
  },
  "ritual-rejeitar-nevoa": {
    "sourcePage": 149,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "area": "nuvem de 6m de raio",
      "duration": "cena",
      "description": [
        "Você manifesta um leve redemoinho de névoa que se movimenta suavemente dentro da área. Rituais conjuradosdentrodaáreatêmseucustoaumentado em +2 PE por círculo e sua execução aumentada em um passo (de livre para movimento, de movimento para padrão, de padrão para completa, de completa paraduasrodadas).RejeitaraNévoaanulaosefeitos deCinerária,amenosqueoconjuradordeCinerária use uma ação completa por rodada para manter o ritual ativo, neutralizando o efeito dos dois rituais.",
        "Discente (+2 PE): além do normal, a DT de testes de resistência contra rituais realizados na área diminui em –5.",
        "Verdadeiro(+5PE):comodiscente,eodanocausado dentro da névoa por rituais é sempre mínimo."
      ]
    }
  },
  "ritual-salto-fantasma": {
    "sourcePage": 149,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "target": "você",
      "duration": "instantânea",
      "description": [
        "SeucorposetransformamomentaneamenteemEnergiapuraeviajaatéoutroponto.Vocênãoprecisapercebernemterlinhadeefeitoaoseudestino,podendo apenas imaginá-lo, desde que já tenha observado o local de alguma forma (em pessoa, por fotografia, por vídeo…). Por exemplo, pode se transportar 3m adiante para ultrapassar uma porta fechada. Uma vez transportado, você não pode agir pelo resto do seu turno. Este ritual não permite que você apareça dentro de um corpo sólido; se o ponto de chegada não tem espaço livre, você ressurge na área vazia mais próxima.",
        "Discente (+2 PE): muda a execução para reação. Em vez do normal, você salta para um espaço adjacente (1,5m), recebendo +10 na Defesa e em testes de Reflexos contra um ataque ou efeito que esteja prestes a atingi-lo.",
        "Verdadeiro (+4 PE): muda o alcance para longo e o alvoparavocêeatédoisoutrosseresvoluntáriosque você esteja tocando."
      ]
    }
  },
  "ritual-sopro-do-caos": {
    "sourcePage": 150,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "area": "varia",
      "duration": "sustentada",
      "resistance": "veja texto",
      "description": [
        "Você altera os movimentos de massas de ar de forma caótica. Ao conjurar o ritual, escolha um dos efeitos abaixo. Ascender:criaumacorrentedearascendentecapaz de erguer do chão um ser ou objeto Médio, fazendo o alvo ﬂutuar para cima e para baixo conforme sua vontade. Você pode gastar uma ação de movimento para subir ou descer o alvo até 6m por rodada, até um máximo de 30m de altura. Você não pode mover o alvo horizontalmente — mas o alvo pode, por exemplo, escalar uma colina ou se apoiar no teto para mover-se para os lados (com metade de seu deslocamento normal). Um ser levitando fica vulnerável. Alvos involuntários têm direito a um teste de Fortitude no início de cada um de seus turnos para encerrar o efeito. Derrubar um alvo flutuando (simplesmente parando a corrente de ar) causa o dano normal de queda, mas um alvo que passe no teste pode “nadar” para o chão contra a corrente. Você pode usar essa opção para fazer uma manobra derrubar contra um alvo voador dentro do alcance, usando Ocultismo em vez de Luta. Sopro: cria uma lufada de vento a partir de suas mãos, que empurra qualquer alvo Médio ou menor, em um cone de 4,5m — faça uma manobra empurrar usando Ocultismo em vez de Luta, usando uma mesma rolagem sua para todos os alvos. A lufada de vento também faz qualquer coisa que um vento forte e súbito faria, como levantar pó, dispersar vapores, apagar chamas, espalhar papéis ou mover uma embarcação. Manter o sopro ativo exige uma ação padrão no seu turno. Vento:criaumaáreadeventoforte(página291)dentro do alcance. Se conjurada numa área que já esteja com algum efeito de vento, aumenta esse efeito em um passo. Manter o vento ativo requer uma ação de movimento.Vocêtambémpodeusaressaopçãopara reduzir os efeitos de vento em uma área.",
        "Discente (+3 PE): passa a afetar alvos Grandes.",
        "Verdadeiro (+9 PE): passa a afetar alvos Enormes."
      ]
    }
  },
  "ritual-tecer-ilusao": {
    "sourcePage": 150,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "effect": "ilusão que se estende a até 4 cubos de 1,5m",
      "duration": "cena",
      "resistance": "Vontade desacredita",
      "description": [
        "Este ritual cria uma ilusão visual (uma pessoa, uma parede…) ou sonora (um grito de socorro, um uivo assustador…). O ritual cria apenas imagens ou sons simples, com volume equivalente à voz de uma pessoa para cada cubo de 1,5m no efeito. Não é possível criar cheiros, texturas ou temperaturas, nem sons complexos, como uma música ou diálogo. Seres e objetos atravessam uma ilusão sem sofrer dano,masoritualpode,porexemplo,esconderuma armadilha ou emboscada. A ilusão é dissi pada se você sair do alcance.",
        "Discente (+2 PE): muda o efeito para até 8 cubos de 1,5meaduraçãoparasustentada.Vocêpodecriarilusõesdeimagemesomcombinados,epodecriarsons complexos, odores e sensações térmicas. Também pode criar sensações táteis, como texturas; objetos aindaatravessamailusão,masseresnãoconseguem atravessá-la sem passar em um teste de Vontade. A cada rodada, você pode usar uma ação livre para mover a imagem ou al terar o som, como aumen tar o volume ou fazer com que pareça se afastar ou se aproximar, ainda den tro dos limites do efeito. Você pode, por exemplo, criar a ilusão de um fan tasma que anda pela sala, controlan do seus movimentos. A ilusão ain da é incapaz de causar ou sofrer dano. Quandovocêparadesustentaroritual,aimagemou som persiste por mais uma roda da antes do ritual se dissipar. Requer 2º círculo.",
        "Verdadeiro(+5PE):vocêcriaailusãodeumperigo mortal. Quando o ritual é conjurado, e no início de cada um de seus turnos, um alvo interagindo com a ilusão deve fazer um teste de Vontade; se falhar, acredita que a ilusão é real e sofre 6d6 pontos de dano de Conhecimento. O alvo racionaliza o efeito semprequefalhanoteste(porexemplo,acreditaque o mesmo teto pode cair sobre ele várias vezes). Se um alvo passar em dois testes de Vontade seguidos, o efeito é anulado para ele. Requer 3º círculo."
      ]
    }
  },
  "ritual-tela-de-ruido": {
    "sourcePage": 151,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Este ritual cria uma película de Energia que recobre seucorpoeabsorveenergiacinética.Vocêrecebe30 PV temporários, mas apenas contra dano balístico, de corte, de impacto ou de perfuração. Alternativamente, você pode conjurar este ritual como uma reação quando sofrer dano, recebendo resistência 15 apenas contra esse dano.",
        "Discente (+3 PE): aumenta os PV temporário para 60 e a resistência para 30.",
        "Verdadeiro (+7 PE): muda o alcance para curto e o alvo para 1 ser ou objeto Enorme ou menor. Em vez do normal, cria uma esfera imóvel e tremeluzente com o tamanho do alvo e centrada nele. Nenhum ser, objeto ou efeito de dano pode passar pela esfera, embora seres possam respirar normalmente dentro dela. O alvo tem direito a um teste de Reflexos para evitar ser aprisionado. Requer 4º círculo."
      ]
    }
  },
  "ritual-teletransporte": {
    "sourcePage": 151,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "até 5 seres voluntários",
      "duration": "instantânea",
      "description": [
        "Oritualtransformaocorpoeequipamentodosalvos em energia pura e os faz reaparecer num lugar a sua escolha a até 1.000km. Quando conjura este ritual, você precisa fazer um teste de Ocultismo, com DT definida pelo seu conhecimento sobre o destino. DT 25. Um lugar que você visita com frequência. DT 30. Umlugarquevocêjávisitoupelomenosuma vez. DT 35. Umlugarquevocênuncavisitouesóconhece a partir da descrição de outra pessoa que esteve lá. Você não pode se teletransportar para um lugar que nuncavisitousemadescriçãodealguém.Ouseja,não podesetransportarpara“olocalondeJúliaestápresa” senuncaestevelánemfaloucomalguémqueesteve. Se passar no teste, os alvos chegam ao lugar desejado. Se falhar, você chega em um lugar parecido, mas errado ou distante (até 1d10 x 10 km). Se você falhar por 5 ou mais, o ritual falha, mas você gasta PE normalmente e fica atordoado por 1d4 rodadas.",
        "Verdadeiro (+5 PE): pode se teletransportar para qualquer local na Terra."
      ]
    }
  },
  "ritual-tentaculos-de-lodo": {
    "sourcePage": 151,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "area": "círculo com 6m de raio",
      "duration": "cena",
      "description": [
        "Umafendasombriaseabrenochão,deondesurgem tentácu los feitos de Lodo da Morte. Ao conjurar o ritualenoiníciodecadaumdeseusturnos,vocêfaz umtestedamanobraagarrar(usandoOcultismoem vezdeLuta)contracadaalvonaárea.Sevocêvencer, o ser é agarrado; se já estava agarrado, é esmagado, sofrendo 4d6 pontos de dano (metade impacto, metade Morte). A área do ritual conta como terreno difícil. Os tentáculos são imunes a dano.",
        "Verdadeiro(+5PE):aumentaoraiodaáreapara9m e aumenta o dano dos tentácu los para 6d6."
      ]
    }
  },
  "ritual-terceiro-olho": {
    "sourcePage": 151,
    "details": {
      "execution": "padrão",
      "range": "pessoal",
      "target": "você",
      "duration": "cena",
      "description": [
        "Seusolhosseenchemdesigilosevocêpassaaenxergar auras paranormais em alcance longo. Rituais, itens amaldiçoados e criaturas emitem auras. Você sabe o elemento da aura e seu poder aproximado — rituais de 1º círculo e criaturas de VD até 80 emitem uma aurafraca;rituaisde2ºe3ºcírculosecriaturasdeVD entre 81 e 280 emitem uma aura moderada, e rituais de4ºcírculoecriaturasdeVD281oumaioremitem uma aura poderosa. Alémdisso,vocêpodegastarumaaçãodemovimento para descobrir se um ser que possa ver em alcance médio tem poderes paranormais ou se é capaz de conjurar rituais e de quais elementos.",
        "Discente (+2 PE): muda a duração para 1 dia.",
        "Verdadeiro (+5 PE): também pode enxergar objetos e seres invisíveis, que aparecem como formas translúcidas."
      ]
    }
  },
  "ritual-transfigurar-agua": {
    "sourcePage": 152,
    "details": {
      "execution": "padrão",
      "range": "longo",
      "area": "esfera com 30m de raio",
      "duration": "cena",
      "resistance": "veja texto",
      "description": [
        "Você canaliza Energia sobre um corpo de água, para que ele adquira movimentos e comportamentos paranormais e caóticos. Ao conjurar o ritual, escolha um dos seguintes efeitos. Congelar:todaaáguamundananaáreaécongelada. Seres nadando na área ficam imóveis; escapar exige gas tar uma ação padrão e passar num tes te de Atletismo (DT igual a do ritual). Derreter: gelo mundano na área vira água e o ritual termina.Acritériodomestre,issopodecriarterreno difícil. Enchente:elevaoníveldaáguamundananaáreaem até 4,5m. A sua escolha, muda área para “alvo: uma embarcação”.Oalvorecebe+6memseudeslocamento pela duração do efeito. Evaporar: toda a água e gelo mundano na área evaporam instantaneamente e o ritual termina. Qualquer ser vivo na área sofre 5d8 de dano de Energia (Fortitude reduz à metade). Partir: diminui o nível de toda água mundana na área em até 4,5m. Em um corpo d’água raso, isso abre um cami nho seco, que pode ser atravessado a pé. Em um corpo d’água profundo, cria um redemoinho que pode prender barcos (um teste de Pilotagem com DT igual à do ritual permite ao pilo to livrar a embarcação).",
        "Verdadeiro (+5 PE): aumenta o deslocamento de enchentepara+12meodanodeevaporarpara10d8."
      ]
    }
  },
  "ritual-transfigurar-terra": {
    "sourcePage": 152,
    "details": {
      "execution": "padrão",
      "range": "longo",
      "area": "9 cubos com 1,5m de lado",
      "duration": "instantânea",
      "resistance": "veja texto",
      "description": [
        "Você imbui terra, pedra, lama, argila ou areia na área com Energia, gerando efeitos sobrenaturais e caóticos. Ao conjurar o ritual, escolha um dos seguintes efeitos. Amolecer: se afetar o teto, uma coluna ou suporte, provoca um desabamen to que causa 10d6 pontos de dano de impacto aos seres na área (Reflexos reduz à metade). Se afetar um piso de terra ou pedra, cria terreno difícil de areia ou argila, respectivamente. Modelar:podeusarpedraouargilaparacriarumou mais objetos simples de ta manho Enorme ou menor (sem meca nismos ou partes móveis). Por exem plo, podetransformarumtijoloemummartelo,criaruma passagemondeanteshaviaapenasumaparedeoule vantarumaoumaisparedesqueoferecemcobertura total (RD 8 e 50 PV para cada 3m). Solidificar: transforma lama ou areia em terra ou pedra.Serescomospésnasuperfícieficamagarrados. Elespodemsesoltarcomumaaçãopadrãoeumteste de Atletismo (DT igual a do ritual).",
        "Discente (+3 PE): muda a área para 15 cubos com 1,5m de lado.",
        "Verdadeiro(+7PE):tambémafetatodosostiposde minerais e metais. Requer 4º círculo."
      ]
    }
  },
  "ritual-transfusao-vital": {
    "sourcePage": 152,
    "details": {
      "execution": "padrão",
      "range": "toque",
      "target": "1 ser",
      "duration": "instantânea",
      "description": [
        "Você toca outro ser e transfere sua própria energia vital para ele, podendo perder até 30 pontos de vida paraqueoalvorecupereamesmaquantidadeemPV. Você não pode ficar com menos de 1 PV por causa desse ritual.",
        "Discente(+3PE):Vocêpodetransferiraté50pontos de vida. Requer 3º círculo.",
        "Verdadeiro (+7 PE): Você pode transferir até 100 pontos de vida. Requer 4º círculo."
      ]
    }
  },
  "ritual-velocidade-mortal": {
    "sourcePage": 152,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "sustentada",
      "description": [
        "Vocêdistorceapassagemdotempoaoredordoalvo, tornando-oextremamenteveloz.Oalvopoderealizar uma ação de movimento adicional por turno. Esta ação não pode ser usada para conjurar rituais.",
        "Discente(+3PE):emvezdeumaaçãodemovimento, o alvo recebe uma ação padrão adicional por turno.",
        "Verdadeiro (+7 PE): muda o alvo para “alvos es colhidos”. Requer 4º círculo e afinidade."
      ]
    }
  },
  "ritual-videncia": {
    "sourcePage": 153,
    "details": {
      "execution": "completa",
      "range": "ilimitado",
      "target": "1 ser",
      "duration": "5 rodadas",
      "resistance": "Vontade anula",
      "description": [
        "Atravésdeumasuperfíciereflexiva,comoumespelho, umabaciadeáguaoumesmoumaTVdesligada,você pode ver e ouvir um ser escolhido e seus arredores (cercade6memqualquerdireção).Oalvopodeestar a qualquer distância, mas tem direito a um teste de resistência no início de cada um de seus turnos para impedir a Vidência naquele turno. Se o alvo passar em dois testes seguidos, o ritual é encerrado e o alvo fica imune a ele por uma semana. Para esse ritual funcionar,vocêprecisateralgumainformaçãosobre oalvo,comoseunomeouumafoto.Dependendodo conhecimentoquevocêtiverdele,oalvorecebebônus ou penalidades em seu teste de resistência. I Você sabe o mínimo sobre o alvo: +10. I Você possui algumas informações sobre o alvo (idade, profissão…) ou já o viu pessoalmente: +5. I Você conhece bem o alvo: –0. I Você tem um pertence pessoal ou roupa do alvo: –5. I Você tem uma parte do corpo do alvo (unhas, cabelos…): –10."
      ]
    }
  },
  "ritual-vinculo-de-sangue": {
    "sourcePage": 153,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 ser",
      "duration": "cena",
      "resistance": "Fortitude",
      "description": [
        "anula Você manifesta um símbolo de Sangue no seucorpoenocorpodo alvo. Sempre que você sofrer dano, o alvo deve fazer um teste de Fortitude. Se ele falhar, você sofre apenas metade do dano e ele sofre a metade restante. Você pode conjurar o ritual com efeito inverso, fazendo com que você receba metade de todo o dano queoalvoreceberia.Alvosvoluntáriosnãoprecisam fazer testes de resistência."
      ]
    }
  },
  "ritual-vomitar-pestes": {
    "sourcePage": 153,
    "details": {
      "execution": "padrão",
      "range": "médio",
      "effect": "1 enxame Grande (quadrado de 3m)",
      "duration": "sustentada",
      "resistance": "Reflexos reduz à metade",
      "description": [
        "Você vomita um enxame de pequenas criaturas de Sangue, que surge em um ponto adjacente a sua escolha. O enxame pode passar pelo espaço de outros seresenãoimpedequeoutrosseresentremnoespaço dele. No final de cada um de seus turnos, o enxame cau sa 5d12 pontos de dano de sangue a qual quer ser noespaçodele(Reflexosreduzàmetade).Vocêpode gastarumaaçãodemovimentoparamoveroenxame com deslocamento de 12m.",
        "Discente(+2PE):alémdonormal,umalvoquefalhe no teste de Reflexos fica agar rado (o enxame escala e cobre o corpo dele). O alvo pode gastar uma ação padrão e fazer um teste de Acrobacia ou Atletismo paraescapar.Sevocêmoveroenxame,oalvoficalivre.",
        "Verdadeiro (+5 PE): o enxame vira Enorme (cubo de 6m de lado) e ganha deslocamento de voo 18m."
      ]
    }
  },
  "ritual-zerar-entropia": {
    "sourcePage": 153,
    "details": {
      "execution": "padrão",
      "range": "curto",
      "target": "1 pessoa",
      "duration": "cena",
      "resistance": "Vontade parcial",
      "description": [
        "Você zera completamente a entropia do alvo em re-"
      ]
    }
  }
};
