import { ButtonComponent, TFile, ToggleComponent } from "obsidian";
import ExcalidrawView from "../../view/ExcalidrawView";
import ExcalidrawPlugin from "../../core/main";
import { getPDFDoc } from "src/utils/fileUtils";
import {  Modal, Setting, TextComponent } from "obsidian";
import { FileSuggestionModal } from "../Suggesters/FileSuggestionModal";
import { getEA } from "src/core";
import { ExcalidrawAutomate } from "src/shared/ExcalidrawAutomate";
import { ExcalidrawImperativeAPI } from "@zsviczian/excalidraw/types/excalidraw/types";
import { t } from "src/lang/helpers";

export class InsertPDFModal extends Modal {
  private borderBox: boolean = true;
  private frame: boolean = false;
  private gapSize:number = 20;
  private groupPages: boolean = false;
  private direction: "down" | "right" = "right";
  private numColumns: number = 1;
  private numRows: number = 1;
  private lockAfterImport: boolean = true;
  private pagesToImport:number[] = [];
  private pageDimensions: {width: number, height: number} = {width: 0, height: 0};
  private importScale = 0.3;
  private imageSizeMessage: HTMLElement;
  private pdfDoc: any;
  private pdfFile: TFile;
  private dirty: boolean = false;

  constructor(
    private plugin: ExcalidrawPlugin,
    private view: ExcalidrawView,
  ) {
    super(plugin.app);
  }

  open (file?: TFile) {
    if(file && file.extension.toLowerCase() === "pdf") {
      this.pdfFile = file;
    }
    super.open();
  }

  onOpen(): void {
    this.containerEl.classList.add("excalidraw-release");
    this.titleEl.setText(`Import PDF`);
    this.createForm();
  }

  async onClose() {
    if(this.dirty) {
      this.plugin.settings.pdfImportScale = this.importScale;
      this.plugin.settings.pdfBorderBox = this.borderBox;
      this.plugin.settings.pdfFrame = this.frame;
      this.plugin.settings.pdfGapSize = this.gapSize;
      this.plugin.settings.pdfGroupPages = this.groupPages;
      this.plugin.settings.pdfNumColumns = this.numColumns;
      this.plugin.settings.pdfNumRows = this.numRows;
      this.plugin.settings.pdfDirection = this.direction;
      this.plugin.settings.pdfLockAfterImport = this.lockAfterImport;
      await this.plugin.saveSettings();
    }
    if(this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.plugin = null;
    this.view = null;
    this.app = null;
    this.imageSizeMessage.remove();
    this.setImageSizeMessage  = null;
  }

  private async getPDFPageDimensions (pdfDoc: any) {
    try {
      const scale = this.plugin.settings.pdfScale;
      const canvas = createEl("canvas");
      const page = await pdfDoc.getPage(1);
      // Set scale
      const viewport = page.getViewport({ scale });
      this.pageDimensions.height = viewport.height; 
      this.pageDimensions.width = viewport.width;

      //https://github.com/excalidraw/excalidraw/issues/4036
      canvas.width = 0;
      canvas.height = 0;
      this.setImageSizeMessage();
    } catch(e) {
      console.log(e);
    }
  }


  /**
   * Creates a list of numbers from page ranges representing the pages to import.
   * sets the pagesToImport property.
   * @param pageRanges A string representing the pages to import. e.g.: 1,3-5,7,9-10
   * @returns A list of numbers representing the pages to import.
   */
  private createPageListFromString(pageRanges:string):number[] {
    const cleanNonDigits = (str:string) => str.replace(/\D/g, "");
    this.pagesToImport = [];
    const pageRangesArray:string[] = pageRanges.split(",");
    pageRangesArray.forEach((pageRange) => {
      const pageRangeArray = pageRange.split("-");
      if(pageRangeArray.length === 1) {
        const page = parseInt(cleanNonDigits(pageRangeArray[0]));
        !isNaN(page) && this.pagesToImport.push(page);
      } else if(pageRangeArray.length === 2) {

        const start = parseInt(cleanNonDigits(pageRangeArray[0]));
        const end = parseInt(cleanNonDigits(pageRangeArray[1]));
        if(isNaN(start) || isNaN(end)) return;
        for(let i = start; i <= end; i++) {
          this.pagesToImport.push(i);
        }
      }
    });
    return this.pagesToImport;
  }

  private setImageSizeMessage = () => this.imageSizeMessage.innerText = `${Math.round(this.pageDimensions.width*this.importScale)} x ${Math.round(this.pageDimensions.height*this.importScale)}`;

  async createForm() {
    await this.plugin.loadSettings();
    this.borderBox = this.plugin.settings.pdfBorderBox;
    this.frame = this.plugin.settings.pdfFrame;
    this.gapSize = this.plugin.settings.pdfGapSize;
    this.groupPages = this.plugin.settings.pdfGroupPages;
    this.numColumns = this.plugin.settings.pdfNumColumns;
    this.numRows = this.plugin.settings.pdfNumRows;
    this.direction = this.plugin.settings.pdfDirection;
    this.lockAfterImport = this.plugin.settings.pdfLockAfterImport;
    this.importScale = this.plugin.settings.pdfImportScale;

    const ce = this.contentEl;   


    let numPagesMessage: HTMLParagraphElement;
    let numPages: number;
    let importButton: ButtonComponent;
    let importMessage: HTMLElement;
    
    const importButtonMessages = () => {
      if(!this.pdfDoc) {
        importMessage.innerText = t("IPM_SELECT_PDF");
        importButton.buttonEl.style.display="none";
        return;
      }      
      if(this.pagesToImport.length === 0) {
        importButton.buttonEl.style.display="none";
        importMessage.innerText = t("IPM_SELECT_PAGES_TO_IMPORT");
        return
      }
      if(Math.max(...this.pagesToImport) <= this.pdfDoc.numPages) {
        importButton.buttonEl.style.display="block";
        importMessage.innerText = "";
        return;
      }
      else {
        importButton.buttonEl.style.display="none";
        importMessage.innerText = `The selected document has ${this.pdfDoc.numPages} pages. Please select pages between 1 and ${this.pdfDoc.numPages}`;
        return
      }
    }

    const numPagesMessages = () => {
      if(numPages === 0) {
        numPagesMessage.innerText = t("IPM_SELECT_PDF");
        return;
      }
      numPagesMessage.innerHTML = `There are <b>${numPages}</b> pages in the selected document.`;
    }

    let pageRangesTextComponent: TextComponent
    let importPagesMessage: HTMLParagraphElement;

    const rangeOnChange = (value:string) => {
      const pages = this.createPageListFromString(value);
      if(pages.length > 15) {
        importPagesMessage.innerHTML = `You are importing <b>${pages.length}</b> pages. ⚠️ This may take a while. ⚠️`;
      } else {
        importPagesMessage.innerHTML = `You are importing <b>${pages.length}</b> pages.`;
      }
      importButtonMessages();
    }

    const setFile = async (file: TFile) => {
      if(this.pdfDoc) await this.pdfDoc.destroy();
      this.pdfDoc = null;

      if(file) {
        this.pdfDoc = await getPDFDoc(file);
        this.pdfFile = file;
        if(this.pdfDoc) {
          numPages = this.pdfDoc.numPages;
          pageRangesTextComponent.setValue(`1-${numPages}`);
          rangeOnChange(`1-${numPages}`);
          importButtonMessages();
          numPagesMessages();
          this.getPDFPageDimensions(this.pdfDoc);
        } else {
          importButton.setDisabled(true);
        }
      } 
    }

    const search = new TextComponent(ce);
    search.inputEl.style.width = "100%";
    const suggester = new FileSuggestionModal(
      this.app,
      search,this.app.vault.getFiles().filter((f: TFile) => f.extension.toLowerCase() === "pdf"),
      this.plugin
    );
    search.onChange(async () => {
      const file = suggester.getSelectedItem();
      await setFile(file);
    });
    
    numPagesMessage = ce.createEl("p", {text: ""});
    numPagesMessages();
    new Setting(ce)
      .setName(t("IPM_PAGES_TO_IMPORT_NAME"))
      .setDesc("e.g.: 1,3-5,7,9-10")
      .addText(text => {
        pageRangesTextComponent = text;
        text
          .setValue("")
          .onChange((value) => rangeOnChange(value))
        text.inputEl.style.width = "100%";
      })
    importPagesMessage = ce.createEl("p", {text: ""});
    
    let bbToggle: ToggleComponent;
    let fToggle: ToggleComponent;
    let laiToggle: ToggleComponent;

    this.frame = this.borderBox ? false : this.frame;

    new Setting(ce)
      .setName(t("IPM_ADD_BORDER_BOX_NAME"))
      .addToggle(toggle => {
        bbToggle = toggle;
        toggle
          .setValue(this.borderBox)
          .onChange((value) => {
            this.borderBox = value;
            if(value) {
              this.frame = false;
              fToggle.setValue(false);
            }
            this.dirty = true;
          })
      })

    new Setting(ce)
      .setName(t("IPM_ADD_FRAME_NAME"))
      .setDesc(t("IPM_ADD_FRAME_DESC"))
      .addToggle(toggle => {
        fToggle = toggle;
        toggle
          .setValue(this.frame)
          .onChange((value) => {
            this.frame = value;
            if(value) {
              this.borderBox = false;
              bbToggle.setValue(false);
              if(!this.lockAfterImport) {
                this.lockAfterImport = true;
                laiToggle.setValue(true);
              }
            }
            this.dirty = true;
          })
      })

    new Setting(ce)
      .setName(t("IPM_GROUP_PAGES_NAME"))
      .setDesc(t("IPM_GROUP_PAGES_DESC"))
      .addToggle(toggle => toggle
        .setValue(this.groupPages)
        .onChange((value) => {
          this.groupPages = value
          this.dirty = true;
        }))
  
        
    new Setting(ce)
      .setName("Lock pages on canvas after import")
      .addToggle(toggle => {
        laiToggle = toggle;
        toggle
          .setValue(this.lockAfterImport)
          .onChange((value) => {
            this.lockAfterImport = value
            this.dirty = true;
        })
      })

    let numColumnsSetting: Setting;
    let numRowsSetting: Setting;
    const colRowVisibility = () => {
      switch(this.direction) {
        case "down":
          numColumnsSetting.settingEl.style.display = "none";
          numRowsSetting.settingEl.style.display = "";
          break;
        case "right":
          numColumnsSetting.settingEl.style.display = "";
          numRowsSetting.settingEl.style.display = "none";
          break;
      }
    }
    
    new Setting(ce)
      .setName("Import direction")
      .addDropdown(dropdown => dropdown
        .addOptions({
          "down": "Top > Down",
          "right": "Left > Right"
        })
        .setValue(this.direction)
        .onChange(value => {
          this.direction = value as "down" | "right";
          colRowVisibility();
          this.dirty = true;
        }))

    let columnsText: HTMLDivElement;
    numColumnsSetting = new Setting(ce);
    numColumnsSetting
      .setName("Number of columns")
      .addSlider(slider => slider
        .setLimits(1, 100, 1)
        .setValue(this.numColumns)
        .onChange(value => {
          this.numColumns = value;
          columnsText.innerText = ` ${value.toString()}`;
          this.dirty = true;
        }))
      .settingEl.createDiv("", (el) => {
        columnsText = el;
        el.style.minWidth = "2.3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.numColumns.toString()}`;
      });

    let rowsText: HTMLDivElement;
    numRowsSetting = new Setting(ce);
    numRowsSetting
      .setName("Number of rows")
      .addSlider(slider => slider
        .setLimits(1, 100, 1)
        .setValue(this.numRows)
        .onChange(value => {
          this.numRows = value;
          rowsText.innerText = ` ${value.toString()}`;
          this.dirty = true;
        }))
      .settingEl.createDiv("", (el) => {
        rowsText = el;
        el.style.minWidth = "2.3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.numRows.toString()}`;
      });
    colRowVisibility();

    let gapSizeText: HTMLDivElement;
    new Setting(ce)
      .setName("Size of gap between pages")
      .addSlider(slider => slider
        .setLimits(10, 200, 10)
        .setValue(this.gapSize)
        .onChange(value => {
          this.gapSize = value;
          gapSizeText.innerText = ` ${value.toString()}`;
          this.dirty = true;
        }))
      .settingEl.createDiv("", (el) => {
        gapSizeText = el;
        el.style.minWidth = "2.3em";
        el.style.textAlign = "right";
        el.innerText = ` ${this.gapSize.toString()}`;
      });

    const importSizeSetting = new Setting(ce)
      .setName("Imported page size")
      .setDesc(`${this.pageDimensions.width*this.importScale} x ${this.pageDimensions.height*this.importScale}`)
      .addSlider(slider => slider
        .setLimits(0.1, 1.5, 0.1)
        .setValue(this.importScale)
        .onChange(value => {
          this.importScale = value;
          this.dirty = true;
          this.setImageSizeMessage();
        }))
    
    this.imageSizeMessage = importSizeSetting.descEl;

    const actionButton = new Setting(ce)
      .setDesc("Select a document first")
      .addButton(button => {
        button
          .setButtonText("Import PDF")
          .setCta()
          .onClick(async () => {
            const ea = getEA(this.view) as ExcalidrawAutomate;
            let column = 0;
            let row = 0;
            const imgWidth = Math.round(this.pageDimensions.width*this.importScale);
            const imgHeight = Math.round(this.pageDimensions.height*this.importScale);
            for(let i = 0; i < this.pagesToImport.length; i++) {
              const page = this.pagesToImport[i];
              importMessage.innerText = `Importing page ${page} (${i+1} of ${this.pagesToImport.length})`;
              const topX = Math.round(this.pageDimensions.width*this.importScale*column + this.gapSize*column);
              const topY = Math.round(this.pageDimensions.height*this.importScale*row + this.gapSize*row);

              ea.style.strokeColor = this.borderBox ? "#000000" : "transparent";
              const boxID = ea.addRect(
                topX,
                topY,
                imgWidth,
                imgHeight
              );
              const boxEl = ea.getElement(boxID) as any;
              if(this.lockAfterImport) boxEl.locked = true;

              const imageID = await ea.addImage(
                topX,
                topY,
                this.pdfFile.path + `#page=${page}`,
                false,
                false);
              const imgEl = ea.getElement(imageID) as any;
              imgEl.width = imgWidth;
              imgEl.height = imgHeight;
              if(this.lockAfterImport) imgEl.locked = true;

              ea.addToGroup([boxID,imageID]);

              if(this.frame) {
                const frameID = ea.addFrame(topX, topY,imgWidth,imgHeight,`${page}`);
                ea.addElementsToFrame(frameID, [boxID,imageID]);
                ea.getElement(frameID).link = this.pdfFile.path + `#page=${page}`;
              }
              
              switch(this.direction) {
                case "right":
                  column = (column + 1) % this.numColumns;
                  if(column === 0) row++;
                  break;
                case "down":
                  row = (row + 1) % this.numRows;
                  if(row === 0) column++;
                  break;
              }
            }
            if(this.groupPages) {
              const ids = ea.getElements()
                .filter(el=>!this.frame || (el.type === "frame"))
                .map(el => el.id);
              ea.addToGroup(ids);
            }
            await ea.addElementsToView(true,true,false);
            const api = ea.getExcalidrawAPI() as ExcalidrawImperativeAPI;
            const ids = ea.getElements().map(el => el.id);
            const viewElements = ea.getViewElements().filter(el => ids.includes(el.id));
            api.selectElements(viewElements);
            api.zoomToFit(viewElements);
            ea.destroy();
            this.close();
          })
        importButton = button;
        importButton.buttonEl.style.display = "none";
      });
    importMessage = actionButton.descEl;
    importMessage.addClass("mod-warning");
    if(this.pdfFile) {
      search.setValue(this.pdfFile.path);
      await setFile(this.pdfFile); //on drop if opened with a file
      suggester.close();
      pageRangesTextComponent.inputEl.focus();
    } else {
      search.inputEl.focus();
    }

    importButtonMessages();
  }
}

