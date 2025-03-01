import {
  HostBinding,
  Input,
  ViewChild,
  Component,
  OnInit,
} from "@angular/core";
import { HttpClient, HttpHeaders, HttpResponse } from "@angular/common/http";
import * as Prism from "prismjs";
import * as pretty from 'prettier';
import * as parser from 'prettier/plugins/typescript';
import * as estree from "prettier/plugins/estree";


const DEFAULT_LANGUAGE = "javascript";

function getFileNameExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return "";

  const extName = fileName.substr(dotIndex + 1);
  return extName;
}

function resolveLanguageFromFileName(fileName: string) {
  fileName = fileName.replace(".example-", ".");
  const ext = getFileNameExtension(fileName).toLowerCase();
  switch (ext) {
    case "js":
    case "ts":
    case "javascript":
      return "javascript";
    case "css":
      return "css";
    case "htm":
    case "html":
      return "html";
    default:
      return DEFAULT_LANGUAGE;
  }
}

@Component({
  selector: "app-code-snippet",
  templateUrl: "./code-snippet.component.html",
  styleUrls: ["./code-snippet.component.scss"],
})
export class CodeSnippetComponent implements OnInit {
  public classes: string = "";

  @ViewChild("code", { static: false })
  public codeContainer;

  @Input("src")
  public src: string;

  @Input("language")
  public language: string;

  public status: "default" | "ready" | "loading" | "error" = "default";

  constructor(private _http: HttpClient) {}

  ngOnInit() {
    console.log('jjj')
    let src = this.src;
    console.log(src)
    this.status = "loading";
    if (src) {
      console.log('here')
      this._http
        .get(src, {
          headers: new HttpHeaders().set(
            "Accept",
            "application/json; charset=utf-8"
          ),
        })
        .subscribe({
          next: async (response) => {
            console.log("ABC");
            const language = resolveLanguageFromFileName(src);
            await this._updateContent((<any>response).a, language);
          },
          error: (e) => {
            console.log(e);
            this.status = "error";
          },
        });
    } else {
      const language = this.language || DEFAULT_LANGUAGE;
      const element = this.codeContainer.nativeElement;
      const code = element.innerText;
      this._updateContent(code, language);
    }
  }

  private async _processCode(code: string): Promise<{
    metadata: { [key: string]: any };
    code: string;
  }> {
    const metadata: { [key: string]: any } = {};
    code = code.trim();
    if (code.substring(0, 3) === "---") {
      code = code.replace(/^---\s*(.*)?/, (_, capture) => {
        if (capture[0] == "{" && capture[capture.length - 1] == "}") {
          const json = JSON.parse(capture);
          Object.keys(json).forEach((key) => {
            metadata[key] = json[key];
          });
        }
        return "";
      });
    }

    return {
      code: await pretty.format(code.trim(), {
        parser: "typescript",
        plugins: [parser, estree],
      }),
      metadata,
    };
  }

  private _processMetadata(metadata: { [key: string]: any }) {
    this.classes = metadata["className"] || "";
  }

  private async _updateContent(input: any, language: string) {
    console.log(input)
    this.status = "ready";
    const element = this.codeContainer.nativeElement;
    const { code, metadata } = await this._processCode(input);
    this._processMetadata(metadata);
    const text = Prism.highlight(code, Prism.languages[language], language);
    element.innerHTML = text;
  }
}
