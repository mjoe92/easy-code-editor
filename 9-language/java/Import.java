// Export a PDF file with EasyPdfBuilder
public static void main(String[] args) {
  EasyPdfBuilder builder = new EasyPdfBuilder();

  EasyParagraph paragraph = new EasyParagraph("Hello world");

  builder.add(paragraph);

  EasyPdfWrapper wrapper = new EasyPdfWrapper(builder);
  wrapper.toFile("c:/result.pdf");
}