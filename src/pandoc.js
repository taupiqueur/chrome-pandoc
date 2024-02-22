// This module provides the functionality to copy elements in webpages
// with a document converter program—such as Pandoc.

import '../@types/chrome_shell.js'

/**
 * Copies clicked element in the specified tab with the given document converter.
 *
 * - https://github.com/taupiqueur/chrome-shell/blob/master/docs/api.md
 * - https://developer.chrome.com/docs/extensions/reference/api/scripting#type-InjectionTarget
 * - https://developer.chrome.com/docs/extensions/reference/api/contextMenus#type-OnClickData
 *
 * @param {Command} converterCommand
 * @param {chrome.scripting.InjectionTarget} injectionTarget
 * @param {chrome.contextMenus.OnClickData} clickedData
 * @returns {Promise<void>}
 */
export async function pandoc(converterCommand, injectionTarget, clickedData) {
  const injectionResults = await chrome.scripting.executeScript({
    target: injectionTarget,
    func: getClickedElement,
    args: [clickedData]
  })

  const input = injectionResults.reduce((selectedText, injectionResult) =>
    selectedText.concat(injectionResult.result), ''
  )

  /**
   * @type {CommandResult}
   */
  const commandResult = await chrome.runtime.sendNativeMessage('shell', {
    command: converterCommand.command,
    args: converterCommand.args,
    input,
    output: true
  })

  if (commandResult.status === 0) {
    await chrome.scripting.executeScript({
      target: { tabId: injectionTarget.tabId },
      func: writeTextToClipboard,
      args: [commandResult.output]
    })
  }
}

/**
 * Returns a string containing the HTML serialization of the clicked element.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/contextMenus#type-OnClickData
 *
 * @param {chrome.contextMenus.OnClickData} clickedData
 * @returns {string}
 */
function getClickedElement(clickedData) {
  switch (true) {
    case 'linkUrl' in clickedData && clickedData.mediaType === 'image': {
      const anchorElement = document.createElement('a')
      anchorElement.href = clickedData.linkUrl
      const imageElement = document.createElement('img')
      imageElement.src = clickedData.srcUrl
      anchorElement.append(imageElement)
      return anchorElement.outerHTML
    }

    case 'linkUrl' in clickedData && 'selectionText' in clickedData: {
      const anchorElement = document.createElement('a')
      anchorElement.href = clickedData.linkUrl
      anchorElement.textContent = clickedData.selectionText
      return anchorElement.outerHTML
    }

    case clickedData.mediaType === 'video': {
      const videoElement = document.createElement('video')
      videoElement.src = clickedData.srcUrl
      return videoElement.outerHTML
    }

    case clickedData.mediaType === 'audio': {
      const audioElement = document.createElement('audio')
      audioElement.src = clickedData.srcUrl
      return audioElement.outerHTML
    }

    case clickedData.mediaType === 'image': {
      const imageElement = document.createElement('img')
      imageElement.src = clickedData.srcUrl
      return imageElement.outerHTML
    }

    case 'selectionText' in clickedData: {
      const selection = window.getSelection()
      const templateElement = document.createElement('template')
      const documentFragments = Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneContents()
      )
      templateElement.content.append(...documentFragments)
      return templateElement.innerHTML
    }

    case 'pageUrl' in clickedData: {
      return document.documentElement.outerHTML
    }
  }
}

/**
 * Writes the specified text to the system clipboard.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
 *
 * @param {string} text
 * @returns {Promise<void>}
 */
async function writeTextToClipboard(text) {
  await navigator.clipboard.writeText(text)
}

export default {
  command: 'pandoc',
  args: ['-f', 'html', '-t', 'markdown'],
  process(injectionTarget, clickedData) {
    return pandoc(this, injectionTarget, clickedData)
  }
}
