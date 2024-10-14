from flask import Flask, jsonify, request, render_template
import os
from openai import OpenAI
import logging
import fitz  # PyMuPDF library for handling PDFs

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Set up OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload_pdf', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and file.filename.endswith('.pdf'):
        try:
            pdf_document = fitz.open(stream=file.read(), filetype="pdf")
            pages = []
            for page in pdf_document:
                text = page.get_text()
                pages.append(text)
            return jsonify({"pages": pages})
        except Exception as e:
            app.logger.error(f"An error occurred while processing the PDF: {str(e)}")
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a PDF."}), 400

@app.route('/api/summarize', methods=['POST'])
def summarize():
    text = request.json['text']
    app.logger.info(f"Received text to summarize: {text}")
    
    system_prompt = '''
        You are an AI assistant specializing in providing deeper context, explanations, and relevant information on specific topics. When a user highlights a sentence or topic, your task is to help them explore it further. Use the following approach:

        - Summarize the Basics: Offer a concise explanation of the highlighted topic, covering fundamental concepts and key points.
        - Contextualize: Provide relevant historical, cultural, or situational context that enhances understanding. If applicable, explain why this topic matters or what implications it has.
        - Expand: Explore related concepts, relevant examples, or contrasting perspectives. Feel free to provide interesting facts, recent developments, or expert opinions.
        - Clarify: Simplify complex ideas or technical terms as needed. Anticipate possible areas of confusion and address them proactively.
        - Engage Further: Suggest questions or subtopics the user might want to explore next. Offer avenues for deeper research or related fields of study.
        - Always aim to give accurate, insightful, and engaging information that encourages curiosity and learning.

        Please respond in a format that is easy to read. Don't just return a block of text.

    '''

    try:
        # Call GPT-4 API to generate summary
        app.logger.info("Calling OpenAI API")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the highlighted text:\n\n{text}"}
            ]
        )
        
        summary = response.choices[0].message.content
        app.logger.info(f"Generated summary: {summary}")
        return jsonify({"summary": summary})
    except Exception as e:
        app.logger.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/test_summary')
def test_summary():
    test_text = "This is a test sentence. It should be summarized."
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                {"role": "user", "content": f"Please summarize the following text:\n\n{test_text}"}
            ]
        )
        summary = response.choices[0].message.content
        return f"Original: {test_text}<br>Summary: {summary}"
    except Exception as e:
        return f"An error occurred: {str(e)}"

if __name__ == '__main__':
    app.run(debug=True, port=5001)
