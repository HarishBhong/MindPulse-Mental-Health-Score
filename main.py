# import joblib
# from fastapi import FastAPI

# #we use joblib.load to load the model from a file named 'Mental_Health_Model.pkl'. 
# # This allows us to use the pre-trained model for making predictions or further analysis.
# model = joblib.load('Mental_Health_Model.pkl')

# # raw inputs go into this model and we get predctions as output from the model.

# # now  lets creat objec of the FastAPI class to create an instance of the FastAPI application. 
# # This instance will be used to define routes and handle incoming requests.
# app = FastAPI()

# @app.get("/")
# def greet():
#     return "Hello, welcome to the Mental Health Prediction API!"


import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Literal

from fastapi.middleware.cors import CORSMiddleware #Cross -Origin Resource Sharing (CORS) middleware is used to connect frontend and backend. 
                                                   #It allows the frontend application to make requests to the backend API from a different domain or port.

# Load the trained machine learning model.
model = joblib.load("Mental_Health_Model.pkl")

# Create the FastAPI application
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentData(BaseModel):
    Age                         : int = Field(..., ge=10, le=100)
    Gender                      : Literal["male", "female"]
    Country                     : str
    Academic_Level              : Literal["high school", "undergraduate", "graduate"]
    Most_Used_Platform          : Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter', 'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat']
    Purpose_Of_Use              : Literal['Networking', 'Education', 'Entertainment', 'News']
    Avg_Daily_Usage_Hours       : float = Field(..., ge=0, le=24)
    Daily_Unlocks               : int = Field(..., ge=0)
    Study_Hours                 : float = Field(..., ge=0, le=24)
    Physical_Activity_Hours     : float = Field(..., ge=0, le=24)
    Sleep_Hours_Per_Night       : float = Field(..., ge=0, le=24)
    Stress_Level                : Literal["Low", "Medium", "High", "Very High"]
    #Grouped_country             : str

#describe what we sent back to the user in the response.
#we are now preparing response body
class PredictionResponse(BaseModel):
    predicted_mental_health_score: float

@app.get("/")
def greet():
    return {"message": "Hello, welcome to the Mental Health Prediction API!"}

top_countries = ['Other', 'India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France']

@app.post("/predict", response_model=PredictionResponse)
def predict(data: StudentData):

    country_group = data.Country if data.Country in top_countries else "Other" 

    input_data = pd.DataFrame([{
        "Age"                       : data.Age,
        "Gender"                    : data.Gender,
        "Country"                   : country_group,
        "Academic_Level"            : data.Academic_Level,
        "Most_Used_Platform"        : data.Most_Used_Platform,
        "Purpose_Of_Use"            : data.Purpose_Of_Use,
        "Avg_Daily_Usage_Hours"     : data.Avg_Daily_Usage_Hours,
         "Daily_Unlocks"             : data.Daily_Unlocks,
        "Study_Hours"               : data.Study_Hours,
        "Physical_Activity_Hours"   : data.Physical_Activity_Hours,
        "Sleep_Hours_Per_Night"     : data.Sleep_Hours_Per_Night,
        "Stress_Level"              : data.Stress_Level,
        "Grouped_country"           : country_group
    }])
    prediction = model.predict(input_data)[0]

    return PredictionResponse(predicted_mental_health_score=round(float(prediction), 2))

