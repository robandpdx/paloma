{{- define "paloma.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "paloma.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "paloma.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "paloma.labels" -}}
app.kubernetes.io/name: {{ include "paloma.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "paloma.frontendName" -}}
{{- printf "%s-frontend" (include "paloma.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "paloma.backendName" -}}
{{- printf "%s-backend" (include "paloma.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "paloma.secretName" -}}
{{- if .Values.backend.secrets.existingSecret -}}
{{- .Values.backend.secrets.existingSecret -}}
{{- else -}}
{{- printf "%s-backend-secrets" (include "paloma.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}