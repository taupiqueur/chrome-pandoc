// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers
// Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

import { pandoc } from './pandoc.js'
import optionsWorker from './options/service_worker.js'

// Where we will expose the data we retrieve from the storage.
const storageCache = {
  converters: [
  ]
}

/**
 * Adds items to the browser’s context menu.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/contextMenus
 *
 * @returns {void}
 */
function createMenuItems() {
  for (const [index, converter] of storageCache.converters.entries()) {
    chrome.contextMenus.create({
      id: index.toString(),
      title: `Copy as ${converter.name}`,
      contexts: ['page', 'link', 'video', 'audio', 'image', 'selection']
    })
  }
}

/**
 * Handles the initial setup when the extension is first installed or updated to a new version.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled
 *
 * @param {object} details
 * @returns {void}
 */
function onInstalled(details) {
  switch (details.reason) {
    case 'install':
      onInstall()
      break

    case 'update':
      onUpdate(details.previousVersion)
      break
  }
  createMenuItems()
}

/**
 * Handles the initial setup when the extension is first installed.
 *
 * @returns {void}
 */
function onInstall() {
  fetch('config.json')
    .then((response) => response.json())
    .then((defaults) => chrome.storage.sync.set(defaults))
}

/**
 * Handles the setup when the extension is updated to a new version.
 *
 * @param {string} previousVersion
 * @returns {void}
 */
function onUpdate(previousVersion) {
  fetch('config.json')
    .then((response) => response.json())
    .then((defaults) => chrome.storage.sync.set({
      ...defaults,
      ...storageCache
    }))
}

/**
 * Handles option changes.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/storage#event-onChanged
 *
 * @param {object} changes
 * @param {string} areaName
 * @returns {void}
 */
function onOptionsChange(changes, areaName) {
  switch (areaName) {
    case 'local':
    case 'sync':
      if (changes.converters.newValue) {
        storageCache.converters = changes.converters.newValue
        chrome.contextMenus.removeAll()
        createMenuItems()
      }
      break
  }
}

/**
 * Handles the browser action on click.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/action#event-onClicked
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {void}
 */
function onAction(tab) {
  // Use the user’s preferred converter (the first converter).
  const converterCommand = storageCache.converters[0]
  pandoc(converterCommand, { tabId: tab.id, allFrames: true }, { selectionText: true })
}

/**
 * Handles the context menu on click.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/contextMenus#event-onClicked
 *
 * @param {chrome.contextMenus.OnClickData} clickedData
 * @param {chrome.tabs.Tab} tab
 * @returns {void}
 */
function onMenuItemClicked(clickedData, tab) {
  const converterIndex = parseInt(clickedData.menuItemId, 10)
  const converterCommand = storageCache.converters[converterIndex]
  pandoc(converterCommand, { tabId: tab.id, frameIds: [clickedData.frameId] }, clickedData)
}

/**
 * Handles long-lived connections.
 * Uses the channel name to distinguish different types of connections.
 *
 * https://developer.chrome.com/docs/extensions/develop/concepts/messaging#connect
 *
 * @param {chrome.runtime.Port} port
 * @returns {void}
 */
function onConnect(port) {
  switch (port.name) {
    case 'options':
      optionsWorker.onConnect(port)
      break

    default:
      port.postMessage({
        type: 'error',
        message: `Unknown type of connection: ${port.name}`
      })
  }
}

// Configure Pandoc.
chrome.storage.sync.get((options) => Object.assign(storageCache, options))

// Set up listeners.
// https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.contextMenus.onClicked.addListener(onMenuItemClicked)
chrome.runtime.onConnect.addListener(onConnect)
