from flask import Flask, jsonify, request, render_template
import os
from openai import OpenAI
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Set up OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/summarize', methods=['POST'])
def summarize():
    text = request.json['text']
    app.logger.info(f"Received text to summarize: {text}")
    
    system_prompt = '''
        You are an advanced summarizer and analyst. When provided with highlighted text from a document, generate a detailed summary that not only captures the main points but also offers insights, ideas, and related information.

        Your response should:

        - Summarize the highlighted text concisely, capturing key ideas and themes.
        - Analyze the content by providing additional context or exploring the significance of the main points.
        - Suggest ideas or thoughts related to the content, potentially expanding on the concepts discussed or connecting them to broader topics.
        - Enrich the summary with relevant information that adds value, such as examples, potential implications, or comparisons to similar ideas or concepts.
        - Use a thoughtful and engaging tone, as if you’re guiding the user to a deeper understanding of the highlighted material.

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
    app.run(debug=True)
