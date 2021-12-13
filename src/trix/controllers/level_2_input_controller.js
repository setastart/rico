/* eslint-disable
    no-cond-assign,
    no-this-before-super,
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Level2InputController
import { getAllAttributeNames, squishBreakableWhitespace } from "trix/core/helpers"
import InputController from "trix/controllers/input_controller"

import { dataTransferIsPlainText, keyEventIsKeyboardCommand, objectsAreEqual } from "trix/core/helpers"

import { selectionChangeObserver } from "trix/observers/selection_change_observer"

export default Level2InputController = (function() {
  Level2InputController = class Level2InputController extends InputController {
    constructor(...args) {
      super(...args)
      this.render = this.render.bind(this)
    }

    static initClass() {
      this.prototype.events = {
        keydown(event) {
          if (keyEventIsKeyboardCommand(event)) {
            const command = keyboardCommandFromKeyEvent(event)
            if (this.delegate?.inputControllerDidReceiveKeyboardCommand(command)) {
              return event.preventDefault()
            }
          } else {
            let handler
            let name = event.key
            if (event.altKey) {
              name += "+Alt"
            }
            if (event.shiftKey) {
              name += "+Shift"
            }
            if (handler = this.keys[name]) {
              return this.withEvent(event, handler)
            }
          }
        },

        // Handle paste event to work around beforeinput.insertFromPaste browser bugs.
        // Safe to remove each condition once fixed upstream.
        paste(event) {
          // https://bugs.webkit.org/show_bug.cgi?id=194921
          let href, paste
          if (pasteEventHasFilesOnly(event)) {
            event.preventDefault()
            return this.attachFiles(event.clipboardData.files)

            // https://bugs.chromium.org/p/chromium/issues/detail?id=934448
          } else if (pasteEventHasPlainTextOnly(event)) {
            event.preventDefault()
            paste = {
              type: "text/plain",
              string: event.clipboardData.getData("text/plain"),
            }
            this.delegate?.inputControllerWillPaste(paste)
            this.responder?.insertString(paste.string)
            this.render()
            return this.delegate?.inputControllerDidPaste(paste)

            // https://bugs.webkit.org/show_bug.cgi?id=196702
          } else if (href = event.clipboardData?.getData("URL")) {
            event.preventDefault()
            paste = {
              type: "text/html",
              html: this.createLinkHTML(href),
            }
            this.delegate?.inputControllerWillPaste(paste)
            this.responder?.insertHTML(paste.html)
            this.render()
            return this.delegate?.inputControllerDidPaste(paste)
          }
        },

        beforeinput(event) {
          let handler
          if (handler = this.inputTypes[event.inputType]) {
            this.withEvent(event, handler)
            return this.scheduleRender()
          }
        },

        input(event) {
          return selectionChangeObserver.reset()
        },

        dragstart(event) {
          if (this.responder?.selectionContainsAttachments()) {
            event.dataTransfer.setData("application/x-trix-dragging", true)

            this.dragging = {
              range: this.responder?.getSelectedRange(),
              point: pointFromEvent(event),
            }
          }
        },

        dragenter(event) {
          if (dragEventHasFiles(event)) {
            return event.preventDefault()
          }
        },

        dragover(event) {
          if (this.dragging) {
            event.preventDefault()
            const point = pointFromEvent(event)
            if (!objectsAreEqual(point, this.dragging.point)) {
              this.dragging.point = point
              return this.responder?.setLocationRangeFromPointRange(point)
            }
          } else if (dragEventHasFiles(event)) {
            return event.preventDefault()
          }
        },

        drop(event) {
          if (this.dragging) {
            event.preventDefault()
            this.delegate?.inputControllerWillMoveText()
            this.responder?.moveTextFromRange(this.dragging.range)
            this.dragging = null
            return this.scheduleRender()
          } else if (dragEventHasFiles(event)) {
            event.preventDefault()
            const point = pointFromEvent(event)
            this.responder?.setLocationRangeFromPointRange(point)
            return this.attachFiles(event.dataTransfer.files)
          }
        },

        dragend() {
          if (this.dragging) {
            this.responder?.setSelectedRange(this.dragging.range)
            this.dragging = null
          }
        },

        compositionend(event) {
          if (this.composing) {
            this.composing = false
            return this.scheduleRender()
          }
        },
      }

      this.prototype.keys = {
        ArrowLeft() {
          if (this.responder?.shouldManageMovingCursorInDirection("backward")) {
            this.event.preventDefault()
            return this.responder?.moveCursorInDirection("backward")
          }
        },

        ArrowRight() {
          if (this.responder?.shouldManageMovingCursorInDirection("forward")) {
            this.event.preventDefault()
            return this.responder?.moveCursorInDirection("forward")
          }
        },

        Backspace() {
          if (this.responder?.shouldManageDeletingInDirection("backward")) {
            this.event.preventDefault()
            this.delegate?.inputControllerWillPerformTyping()
            this.responder?.deleteInDirection("backward")
            return this.render()
          }
        },

        Tab() {
          if (this.responder?.canIncreaseNestingLevel()) {
            this.event.preventDefault()
            this.responder?.increaseNestingLevel()
            return this.render()
          }
        },

        "Tab+Shift"() {
          if (this.responder?.canDecreaseNestingLevel()) {
            this.event.preventDefault()
            this.responder?.decreaseNestingLevel()
            return this.render()
          }
        },
      }

      this.prototype.inputTypes = {
        deleteByComposition() {
          return this.deleteInDirection("backward", { recordUndoEntry: false })
        },

        deleteByCut() {
          return this.deleteInDirection("backward")
        },

        deleteByDrag() {
          this.event.preventDefault()
          return this.withTargetDOMRange(function() {
            this.deleteByDragRange = this.responder?.getSelectedRange()
          })
        },

        deleteCompositionText() {
          return this.deleteInDirection("backward", { recordUndoEntry: false })
        },

        deleteContent() {
          return this.deleteInDirection("backward")
        },

        deleteContentBackward() {
          return this.deleteInDirection("backward")
        },

        deleteContentForward() {
          return this.deleteInDirection("forward")
        },

        deleteEntireSoftLine() {
          return this.deleteInDirection("forward")
        },

        deleteHardLineBackward() {
          return this.deleteInDirection("backward")
        },

        deleteHardLineForward() {
          return this.deleteInDirection("forward")
        },

        deleteSoftLineBackward() {
          return this.deleteInDirection("backward")
        },

        deleteSoftLineForward() {
          return this.deleteInDirection("forward")
        },

        deleteWordBackward() {
          return this.deleteInDirection("backward")
        },

        deleteWordForward() {
          return this.deleteInDirection("forward")
        },

        formatBackColor() {
          return this.activateAttributeIfSupported("backgroundColor", this.event.data)
        },

        formatBold() {
          return this.toggleAttributeIfSupported("bold")
        },

        formatFontColor() {
          return this.activateAttributeIfSupported("color", this.event.data)
        },

        formatFontName() {
          return this.activateAttributeIfSupported("font", this.event.data)
        },

        formatIndent() {
          if (this.responder?.canIncreaseNestingLevel()) {
            return this.withTargetDOMRange(function() {
              return this.responder?.increaseNestingLevel()
            })
          }
        },

        formatItalic() {
          return this.toggleAttributeIfSupported("italic")
        },

        formatJustifyCenter() {
          return this.toggleAttributeIfSupported("justifyCenter")
        },

        formatJustifyFull() {
          return this.toggleAttributeIfSupported("justifyFull")
        },

        formatJustifyLeft() {
          return this.toggleAttributeIfSupported("justifyLeft")
        },

        formatJustifyRight() {
          return this.toggleAttributeIfSupported("justifyRight")
        },

        formatOutdent() {
          if (this.responder?.canDecreaseNestingLevel()) {
            return this.withTargetDOMRange(function() {
              return this.responder?.decreaseNestingLevel()
            })
          }
        },

        formatRemove() {
          return this.withTargetDOMRange(function() {
            return (() => {
              const result = []
              for (const attributeName in this.responder?.getCurrentAttributes()) {
                result.push(this.responder?.removeCurrentAttribute(attributeName))
              }
              return result
            })()
          })
        },

        formatSetBlockTextDirection() {
          return this.activateAttributeIfSupported("blockDir", this.event.data)
        },

        formatSetInlineTextDirection() {
          return this.activateAttributeIfSupported("textDir", this.event.data)
        },

        formatStrikeThrough() {
          return this.toggleAttributeIfSupported("strike")
        },

        formatSubscript() {
          return this.toggleAttributeIfSupported("sub")
        },

        formatSuperscript() {
          return this.toggleAttributeIfSupported("sup")
        },

        formatUnderline() {
          return this.toggleAttributeIfSupported("underline")
        },

        historyRedo() {
          return this.delegate?.inputControllerWillPerformRedo()
        },

        historyUndo() {
          return this.delegate?.inputControllerWillPerformUndo()
        },

        insertCompositionText() {
          this.composing = true
          return this.insertString(this.event.data)
        },

        insertFromComposition() {
          this.composing = false
          return this.insertString(this.event.data)
        },

        insertFromDrop() {
          let range
          if (range = this.deleteByDragRange) {
            this.deleteByDragRange = null
            this.delegate?.inputControllerWillMoveText()
            return this.withTargetDOMRange(function() {
              return this.responder?.moveTextFromRange(range)
            })
          }
        },

        insertFromPaste() {
          let href, html, string
          const { dataTransfer } = this.event
          const paste = { dataTransfer }

          if (href = dataTransfer.getData("URL")) {
            let name
            this.event.preventDefault()
            paste.type = "text/html"
            if (name = dataTransfer.getData("public.url-name")) {
              string = squishBreakableWhitespace(name).trim()
            } else {
              string = href
            }
            paste.html = this.createLinkHTML(href, string)
            this.delegate?.inputControllerWillPaste(paste)
            this.withTargetDOMRange(function() {
              return this.responder?.insertHTML(paste.html)
            })

            this.afterRender = () => {
              return this.delegate?.inputControllerDidPaste(paste)
            }
          } else if (dataTransferIsPlainText(dataTransfer)) {
            paste.type = "text/plain"
            paste.string = dataTransfer.getData("text/plain")
            this.delegate?.inputControllerWillPaste(paste)
            this.withTargetDOMRange(function() {
              return this.responder?.insertString(paste.string)
            })

            this.afterRender = () => {
              return this.delegate?.inputControllerDidPaste(paste)
            }
          } else if (html = dataTransfer.getData("text/html")) {
            this.event.preventDefault()
            paste.type = "text/html"
            paste.html = html
            this.delegate?.inputControllerWillPaste(paste)
            this.withTargetDOMRange(function() {
              return this.responder?.insertHTML(paste.html)
            })

            this.afterRender = () => {
              return this.delegate?.inputControllerDidPaste(paste)
            }
          } else if (dataTransfer.files?.length) {
            paste.type = "File"
            paste.file = dataTransfer.files[0]
            this.delegate?.inputControllerWillPaste(paste)
            this.withTargetDOMRange(function() {
              return this.responder?.insertFile(paste.file)
            })

            this.afterRender = () => {
              return this.delegate?.inputControllerDidPaste(paste)
            }
          }
        },

        insertFromYank() {
          return this.insertString(this.event.data)
        },

        insertLineBreak() {
          return this.insertString("\n")
        },

        insertLink() {
          return this.activateAttributeIfSupported("href", this.event.data)
        },

        insertOrderedList() {
          return this.toggleAttributeIfSupported("number")
        },

        insertParagraph() {
          this.delegate?.inputControllerWillPerformTyping()
          return this.withTargetDOMRange(function() {
            return this.responder?.insertLineBreak()
          })
        },

        insertReplacementText() {
          return this.insertString(this.event.dataTransfer.getData("text/plain"), { updatePosition: false })
        },

        insertText() {
          return this.insertString(
            this.event.data != null ? this.event.data : this.event.dataTransfer?.getData("text/plain")
          )
        },

        insertTranspose() {
          return this.insertString(this.event.data)
        },

        insertUnorderedList() {
          return this.toggleAttributeIfSupported("bullet")
        },
      }
    }
    elementDidMutate() {
      if (this.scheduledRender) {
        if (this.composing) {
          return this.delegate?.inputControllerDidAllowUnhandledInput?.()
        }
      } else {
        return this.reparse()
      }
    }

    scheduleRender() {
      return this.scheduledRender != null
        ? this.scheduledRender
        : this.scheduledRender = requestAnimationFrame(this.render)
    }

    render() {
      cancelAnimationFrame(this.scheduledRender)
      this.scheduledRender = null
      if (!this.composing) {
        this.delegate?.render()
      }
      this.afterRender?.()
      this.afterRender = null
    }

    reparse() {
      return this.delegate?.reparse()
    }

    // Responder helpers

    insertString(string = "", options) {
      this.delegate?.inputControllerWillPerformTyping()
      return this.withTargetDOMRange(function() {
        return this.responder?.insertString(string, options)
      })
    }

    toggleAttributeIfSupported(attributeName) {
      let needle
      if (needle = attributeName, Array.from(getAllAttributeNames()).includes(needle)) {
        this.delegate?.inputControllerWillPerformFormatting(attributeName)
        return this.withTargetDOMRange(function() {
          return this.responder?.toggleCurrentAttribute(attributeName)
        })
      }
    }

    activateAttributeIfSupported(attributeName, value) {
      let needle
      if (needle = attributeName, Array.from(getAllAttributeNames()).includes(needle)) {
        this.delegate?.inputControllerWillPerformFormatting(attributeName)
        return this.withTargetDOMRange(function() {
          return this.responder?.setCurrentAttribute(attributeName, value)
        })
      }
    }

    deleteInDirection(direction, { recordUndoEntry } = { recordUndoEntry: true }) {
      let domRange
      if (recordUndoEntry) {
        this.delegate?.inputControllerWillPerformTyping()
      }
      const perform = () => this.responder?.deleteInDirection(direction)
      if (domRange = this.getTargetDOMRange({ minLength: 2 })) {
        return this.withTargetDOMRange(domRange, perform)
      } else {
        return perform()
      }
    }

    // Selection helpers

    withTargetDOMRange(domRange, fn) {
      if (typeof domRange === "function") {
        fn = domRange
        domRange = this.getTargetDOMRange()
      }
      if (domRange) {
        return this.responder?.withTargetDOMRange(domRange, fn.bind(this))
      } else {
        selectionChangeObserver.reset()
        return fn.call(this)
      }
    }

    getTargetDOMRange({ minLength } = { minLength: 0 }) {
      let targetRanges
      if (targetRanges = this.event.getTargetRanges?.()) {
        if (targetRanges.length) {
          const domRange = staticRangeToRange(targetRanges[0])
          if (minLength === 0 || domRange.toString().length >= minLength) {
            return domRange
          }
        }
      }
    }

    withEvent(event, fn) {
      let result
      this.event = event
      try {
        result = fn.call(this)
      } finally {
        this.event = null
      }
      return result
    }
  }
  Level2InputController.initClass()
  return Level2InputController
})()

var staticRangeToRange = function(staticRange) {
  const range = document.createRange()
  range.setStart(staticRange.startContainer, staticRange.startOffset)
  range.setEnd(staticRange.endContainer, staticRange.endOffset)
  return range
}

// Event helpers

var dragEventHasFiles = (event) =>
  Array.from(event.dataTransfer?.types != null ? event.dataTransfer?.types : []).includes("Files")

var pasteEventHasFilesOnly = function(event) {
  let clipboard
  if (clipboard = event.clipboardData) {
    return Array.from(clipboard.types).includes("Files") && clipboard.types.length === 1 && clipboard.files.length >= 1
  }
}

var pasteEventHasPlainTextOnly = function(event) {
  let clipboard
  if (clipboard = event.clipboardData) {
    return Array.from(clipboard.types).includes("text/plain") && clipboard.types.length === 1
  }
}

var keyboardCommandFromKeyEvent = function(event) {
  const command = []
  if (event.altKey) {
    command.push("alt")
  }
  if (event.shiftKey) {
    command.push("shift")
  }
  command.push(event.key)
  return command
}

var pointFromEvent = (event) => ({
  x: event.clientX,
  y: event.clientY,
})
