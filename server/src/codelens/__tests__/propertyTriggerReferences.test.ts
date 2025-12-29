import { TextDocument } from 'vscode-languageserver-textdocument';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { CodeLensProvider } from '../codeLensProvider';

describe('CodeLens - Property Trigger References', () => {
  it('should count references from OnRun trigger', () => {
    const code = `OBJECT Codeunit 1003 Job Task - Indent
{
  PROPERTIES
  {
    TableNo=1001;
    OnRun=BEGIN
            TESTFIELD("Job No.");
            Indent("Job No.");
          END;
  }
  CODE
  {
    VAR
      JT@1006 : Record 1001;

    PROCEDURE Indent@1(JobNo@1000 : Code[20]);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

    // Create text document
    const document = TextDocument.create('file:///test.cal', 'cal', 1, code);

    // Parse
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    // Get CodeLens items
    const provider = new CodeLensProvider();
    const lenses = provider.getCodeLenses(document, ast);

    // Find CodeLens for Indent procedure (should have 1 reference from OnRun)
    const indentLens = lenses.find(lens =>
      lens.command?.title === '1 reference'
    );

    expect(indentLens).toBeDefined();
    expect(indentLens?.command?.title).toBe('1 reference');
  });

  it('should count references to TESTFIELD from OnRun trigger', () => {
    const code = `OBJECT Codeunit 1003 Test
{
  PROPERTIES
  {
    OnRun=BEGIN
            Customer.TESTFIELD("No.");
            Customer.TESTFIELD(Name);
          END;
  }
  CODE
  {
    VAR
      Customer@1000 : Record 18;

    BEGIN
    END.
  }
}`;

    // Create text document
    const document = TextDocument.create('file:///test.cal', 'cal', 1, code);

    // Parse
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    // Get CodeLens items
    const provider = new CodeLensProvider();
    const lenses = provider.getCodeLenses(document, ast);

    // Find CodeLens for Customer variable (should have 2 references from OnRun)
    const customerLens = lenses.find(lens =>
      lens.command?.title === '2 references'
    );

    expect(customerLens).toBeDefined();
    expect(customerLens?.command?.title).toBe('2 references');
  });

  it('should count multiple property trigger references', () => {
    const code = `OBJECT Page 47 Sales Order
{
  PROPERTIES
  {
    OnInit=BEGIN
             Setup;
           END;
    OnOpenPage=BEGIN
                 Setup;
               END;
  }
  CODE
  {
    PROCEDURE Setup@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

    // Create text document
    const document = TextDocument.create('file:///test.cal', 'cal', 1, code);

    // Parse
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();

    // Get CodeLens items
    const provider = new CodeLensProvider();
    const lenses = provider.getCodeLenses(document, ast);

    // Find CodeLens for Setup procedure (should have 2 references - one from each trigger)
    const setupLens = lenses.find(lens =>
      lens.command?.title === '2 references'
    );

    expect(setupLens).toBeDefined();
    expect(setupLens?.command?.title).toBe('2 references');
  });
});
