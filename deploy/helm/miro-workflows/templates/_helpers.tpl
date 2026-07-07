{{/* Common helpers. */}}

{{- define "miro-workflows.fullname" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "miro-workflows.labels" -}}
app.kubernetes.io/name: {{ include "miro-workflows.fullname" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "miro-workflows.selectorLabels" -}}
app.kubernetes.io/name: {{ include "miro-workflows.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
