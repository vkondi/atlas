[⬅️ Back to AI Engineering](../README.md)

# Harness Engineering & MLOps

An operational guide to production ML infrastructure, covering data pipelines, experiment tracking, model versioning, training orchestration, and feature management systems that enable reproducible, scalable AI deployment.

---

## Why It Matters

Building a single AI model is straightforward; shipping production AI systems at scale is not. The difference between a proof-of-concept that works once and a production system that works reliably lies in **harness engineering**: the infrastructure layer that manages datasets, tracks experiments, versions models, orchestrates training runs, and enforces reproducibility. Without proper harness engineering, teams face dataset drift, inability to reproduce model behavior, lost experiment results, and brittle deployment pipelines. Engineers who build harnesses scale from single-model deployments to managing hundreds of models across teams.

---

## Core Concepts

### 1. The Data Pipeline & Feature Engineering

Production AI systems operate on **structured, versioned, curated datasets**. Building this requires a multi-stage pipeline:

```
                    DATA PIPELINE FLOW

   [ Raw Data Sources ]
   (APIs, logs, databases)
         │
         ▼
   ┌──────────────┐
   │  Collection  │ (Aggregate data from multiple sources)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Validation   │ (Schema checks, outlier detection, integrity)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │  Cleaning    │ (Handle nulls, duplicates, format normalization)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Transformation│ (Feature engineering, aggregation, encoding)
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │Feature Store │ (Versioned, indexed feature repository)
   └──────┬───────┘
          ▼
   [ Ready for Training/Serving ]
```

**Feature Stores** (e.g., Tecton, Feast, Hopsworks) centralize feature management:

- **Feature Definition**: Declarative schemas for features (data type, update frequency, dependencies).
- **Feature Versioning**: Track schema changes and data lineage across time.
- **Online/Offline Split**: Offline features for training (historical data), online features for real-time inference (cached, low-latency).
- **Data Lineage**: Audit trails showing which raw data sources feed into which features, enabling root-cause analysis when models degrade.

### 2. Experiment Tracking & Hyperparameter Management

Machine learning requires systematic exploration. Without structured experiment tracking, teams lose:

- Which hyperparameters were used for a given model
- Which dataset version trained the model
- Why one model variant outperformed another
- Historical performance trends across iterations

**Experiment Tracking Platforms** (Weights & Biases, MLflow, Comet, Neptune) record:

```
                  EXPERIMENT LIFECYCLE

   [ Code Version ]
   (Git commit hash)
         │
         ├─────────────────┐
         ▼                 ▼
   [ Hyperparameters ]  [ Dataset Version ]
   (learning_rate,      (data_hash,
    batch_size, ...)    split_ratio, ...)
         │                 │
         └────────┬────────┘
                  ▼
        [ Training Run Initiated ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   [ Metrics Logged ]  [ Artifacts Saved ]
   (loss, accuracy,    (model weights,
    val_loss, ...)     plots, logs, ...)
        │                   │
        └─────────┬─────────┘
                  ▼
        [ Run Completed & Indexed ]
        (queryable via metadata)
```

### 3. Model Registry & Versioning

Models are not one-time artifacts; they evolve. A **Model Registry** centralizes all model versions with:

- **Metadata**: Training date, hyperparameters, dataset version, author, performance metrics.
- **Stages**: Experimental → Staging → Production (promotion workflows).
- **Lineage**: Reproducibility—re-run the training pipeline with exact same inputs to regenerate the model.
- **Governance**: Access controls, deployment approvals, rollback capabilities.

```
                    MODEL REGISTRY WORKFLOW

   Training (Run tracked in MLflow)
         │
         ▼
   Model Artifact Created
   (e.g., model_v1.pkl, config.json)
         │
         ▼
   ┌──────────────────────┐
   │  Register in Registry│  <── MLflow Model Registry
   │  (Experimental Stage)│
   └──────────────────────┘
         │
   ┌─────┴─────┐
   ▼           ▼
[Promote to Staging]  [A/B Test in Production]
   │                       │
   ▼                       ▼
[Run Integration Tests]  [Monitor Metrics]
   │                       │
   └──────────┬────────────┘
              ▼
   [Promote to Production]
         │
         ▼
   [Serve via Model Endpoint]
```

### 4. Training Orchestration & Distributed Workflows

As model complexity grows, training shifts from a single machine to distributed clusters. **Training Orchestration** (Kubernetes, Ray, Kubeflow) manages:

- **Resource Allocation**: Distributing training across GPUs/TPUs.
- **Fault Tolerance**: Checkpointing progress and resuming after failures.
- **Hyperparameter Sweeps**: Running hundreds of training variants in parallel.
- **Pipeline DAGs**: Expressing training workflows as directed acyclic graphs (e.g., "run data preprocessing, then launch 10 parallel training jobs with different hyperparameters, then evaluate and select the best model").

### 5. Data Versioning & Reproducibility

The reproducibility crisis in ML stems from **data that changes without version control**. Modern harness engineering treats datasets like code:

- **Dataset Snapshots**: Tag immutable versions of datasets (e.g., `training_data@v1.2.3`).
- **Data Lineage**: Track which source tables/APIs feed into each version.
- **Schema Registry**: Enforce data contracts—if a feature column's type or distribution shifts unexpectedly, fail the pipeline.

```
                   DATA VERSIONING FLOW

   [ Source Data ]
         │
         ▼
   [ Data Validation ]
   (Schema check: all features present and correct type?)
         │
         ├─ FAIL ─→ [Alert & Block Pipeline]
         │
         ▼ PASS
   [ Compute Dataset Hash ]
   (SHA-256 of all rows + metadata)
         │
         ▼
   [ Tag Version ]
   (dataset:train:20261109:v1)
         │
         ▼
   [ Snapshot Stored in DVC / Data Lake ]
   (Immutable reference for reproducibility)
```

---

## Real-World Production Learnings

We built an internal recommendation engine for product discovery. The initial MVP trained a single collaborative filtering model on historical user interactions and achieved strong offline metrics (0.89 NDCG). We deployed it to production without a harness infrastructure.

**The Failure**:

Within 3 weeks, recommendation quality degraded. We investigated and discovered multiple cascading failures:

1. **Dataset Drift**: The data pipeline silently broke when an upstream API changed response format. The training script continued, but the feature columns were now offset by one position, causing garbage predictions.
2. **Experiment Loss**: The engineer who trained the model left the team. No record existed of which hyperparameters were used, which dataset version was trained, or which code commit generated the model.
3. **Rollback Impossible**: When we detected degradation, we attempted to rollback to the previous model version, but it was missing—the model binary had been overwritten locally.
4. **Retrain Cost Unknown**: Retraining the model took 48 hours on a large cluster, but we had no record of the computational cost.

**The Diagnostic**:

- No experiment tracking → no reproducibility.
- No data versioning → unable to diagnose dataset drift.
- No model registry → unable to track versions or roll back.
- No pipeline orchestration → data pipeline failures went silent.

**The Refactor**:

We implemented a complete harness architecture:

1. **Feature Store (Feast)**: Centralized feature definitions with versioning. Each training run pins a specific feature set version.
2. **Experiment Tracking (MLflow)**: Every training run logs hyperparameters, dataset version hash, metrics, and model artifacts.
3. **Model Registry**: Each model version is registered with metadata. Rollback is one button press.
4. **Data Pipeline (Airflow)**: DAG-based workflow with schema validation checkpoints. If validation fails, the pipeline halts and alerts.
5. **Data Versioning (DVC)**: Dataset snapshots tagged with immutable hashes. Training always reproduces against the exact dataset version.

Here is a simplified orchestration script using MLflow and Feast:

```python
import mlflow
import pandas as pd
from feast import FeatureStore
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import ndcg_score
import hashlib

class RecommendationModelPipeline:
    def __init__(self, feature_store_repo_path: str):
        self.feature_store = FeatureStore(repo_path=feature_store_repo_path)
        mlflow.set_experiment("recommendation_engine")

    def load_features(self, feature_set_name: str, entities: list) -> pd.DataFrame:
        """Load features from Feast feature store with version tracking."""
        features = self.feature_store.get_historical_features(
            entity_df=pd.DataFrame({"user_id": entities}),
            features=[f"{feature_set_name}:*"],
        )
        feature_df = features.to_df()

        # Compute dataset hash for reproducibility
        dataset_hash = hashlib.sha256(
            pd.util.hash_pandas_object(feature_df, index=True).values
        ).hexdigest()

        return feature_df, dataset_hash

    def train_and_log(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        dataset_hash: str,
        hyperparams: dict,
    ) -> str:
        """Train model and log experiment to MLflow."""
        with mlflow.start_run(run_name="recommendation_v2"):
            # Log hyperparameters
            mlflow.log_params(hyperparams)

            # Log dataset version for reproducibility
            mlflow.log_param("dataset_hash", dataset_hash)

            # Train model
            X_train = train_df.drop("target", axis=1)
            y_train = train_df["target"]
            X_val = val_df.drop("target", axis=1)
            y_val = val_df["target"]

            model = RandomForestRegressor(**hyperparams)
            model.fit(X_train, y_train)

            # Evaluate
            val_pred = model.predict(X_val)
            ndcg = ndcg_score([y_val], [val_pred])
            accuracy = model.score(X_val, y_val)

            # Log metrics
            mlflow.log_metric("ndcg", ndcg)
            mlflow.log_metric("accuracy", accuracy)

            # Log model artifact
            mlflow.sklearn.log_model(model, "model")

            run_id = mlflow.active_run().info.run_id
            print(f"Training completed. Run ID: {run_id}")
            return run_id

    def register_model(self, run_id: str, model_name: str):
        """Register trained model in MLflow Model Registry."""
        model_uri = f"runs:/{run_id}/model"
        mlflow.register_model(model_uri, model_name)
        print(f"Model registered: {model_name}")

    def pipeline(
        self,
        feature_set_name: str,
        entity_ids: list,
        hyperparams: dict,
        model_name: str,
    ):
        """End-to-end pipeline: load features, train, evaluate, register."""
        print(f"[1] Loading features from {feature_set_name}...")
        train_df, dataset_hash = self.load_features(feature_set_name, entity_ids)

        print(f"[2] Dataset hash: {dataset_hash}")

        # Split into train/val
        val_df = train_df.sample(frac=0.2, random_state=42)
        train_df = train_df.drop(val_df.index)

        print(f"[3] Training model with hyperparams: {hyperparams}")
        run_id = self.train_and_log(train_df, val_df, dataset_hash, hyperparams)

        print(f"[4] Registering model in registry...")
        self.register_model(run_id, model_name)

        print("[5] Pipeline complete.")

# Usage
pipeline = RecommendationModelPipeline(
    feature_store_repo_path="./feast_repo"
)

hyperparams = {
    "n_estimators": 100,
    "max_depth": 10,
    "min_samples_split": 5,
}

pipeline.pipeline(
    feature_set_name="user_interactions",
    entity_ids=[1, 2, 3, 4, 5],
    hyperparams=hyperparams,
    model_name="recommendation_model",
)
```

By implementing this harness infrastructure, we:

- Recovered the ability to reproduce model behavior exactly.
- Detected and fixed dataset drift within 1 hour of deployment.
- Rolled back to previous model versions with zero downtime.
- Reduced model retraining feedback loops from 48 hours to 6 hours by parallelizing hyperparameter sweeps.

---

## Related Reading

- [AI Engineering Basics](../fundamentals/basics.md)
- [LLM Foundations](../fundamentals/llm-foundations.md)
- [Evals and Benchmarks](../fundamentals/evals-and-benchmarks.md)
- [Monitoring and Observability](../operations-and-observability/monitoring-and-observability.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.production-infrastructure.harness-engineering-and-mlops.md)
