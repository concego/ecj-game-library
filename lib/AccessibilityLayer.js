/**
 * AccessibilityLayer.js — ECJ Game Library
 *
 * REGRA DE OURO:
 *   Esta lib não toca em áudio nem em visual.
 *   O que fica aqui é exclusivamente infraestrutura de acessibilidade:
 *   anúncios para leitores de tela (speak) e feedback tátil (vibrate).
 *   Estilo, layout e aparência do elemento aria-live são responsabilidade
 *   do projeto que usa a lib.
 *
 * Pré-requisito:
 *   O projeto deve criar um elemento com aria-live="assertive" e aria-atomic="true"
 *   no HTML e passar o seu id para AccessibilityLayer.create({ announcerId: "..." }).
 *   Exemplo:
 *     <div id="announcer" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
 *
 * Uso:
 *   import { AccessibilityLayer } from "../../lib/AccessibilityLayer.js";
 *
 *   const a11y = AccessibilityLayer.create({ announcerId: "announcer" });
 *   a11y.speak("Peixe fisgado!");
 *   a11y.vibrate("bite");
 */

export const AccessibilityLayer = {
  create({ announcerId = "announcer" } = {}) {
    let _el = null;

    function init() {
      _el = document.getElementById(announcerId);
      if (!_el) {
        console.warn(
          `[AccessibilityLayer] Elemento #${announcerId} não encontrado. ` +
          `Crie um <div id="${announcerId}" aria-live="assertive" aria-atomic="true"> no seu HTML.`
        );
      }
    }

    // Double-rAF: força TalkBack/NVDA a interromper leitura anterior
    function speak(text) {
      if (!_el) init();
      if (!_el) return;
      _el.textContent = "";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { _el.textContent = text; });
      });
    }

    // Padrões de vibração semânticos — feedback tátil é parte da mecânica acessível
    const _patterns = {
      bite:    [100, 50, 100],
      snap:    [500],
      caught:  [100, 50, 100, 50, 300],
      warning: [200, 100, 200],
      tick:    [30],
    };

    function vibrate(event) {
      if (!navigator.vibrate) return;
      const pattern = _patterns[event] ?? [100];
      navigator.vibrate(pattern);
    }

    // Permite ao dev registrar padrões adicionais sem alterar a lib
    function addVibrationPattern(name, pattern) {
      _patterns[name] = pattern;
    }

    function focusElement(id) {
      const el = document.getElementById(id);
      if (el) el.focus();
    }

    return { init, speak, vibrate, addVibrationPattern, focusElement };
  }
};
