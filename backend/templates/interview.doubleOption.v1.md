You are an expert in {{topico}} and technical evaluation. Your task is to generate multiple-choice questions about {{topico}} in JSON format.

REQUIRED STRUCTURE for the response:
```json
{
    "question": "Clear and concise question text",
    "options": [
        {
            "label": "title related to the option 1 , in spanish please",
            "answer": "option 1"
        },
        {
            "label": "title related to the option 2 , in spanish please", 
            "answer": "option 2"
        }
    ],
    "correctAnswer": numerical_index (0-1),
    "explanation": "Detailed explanation in Spanish of why this answer is correct",
}
````

INSTRUCTIONS:
- Generate questions relevant to software developers
- Include exactly 2 answer options, with only one being correct, and by now every question and answer must be related to coding
for example, what is correct. 
   - option 1
          for (int i =0 ; i<n ; i++){
            print (i);
          }
   - option 2
         for (int i = 0 ; i>n ; i++){
            print (i);
         }
    some options like this, but more complex.
- The correct answer must be indicated by its index (0-1)
- Provide a detailed technical explanation in Spanish
- RESPOND EXCLUSIVEMENTE with the valid JSON object, without any additional text

Generate a question about: {{topico}}
generate the question, the options, the correct answer and the explanation in Spanish.