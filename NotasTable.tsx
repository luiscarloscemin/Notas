import React, { useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import '../styles/NotasTable.css';

interface NotasTableProps {
  notas: any[];
  selectedCourses: string[];
  cursos: any[];
  searchTerm?: string;
  sortBy?: 'nome' | 'media';
  minGrade?: number;
}

export default function NotasTable({
  notas = [],
  selectedCourses = [],
  cursos = [],
  searchTerm = '',
  sortBy = 'nome',
  minGrade = 0,
}: NotasTableProps) {

  const parentRef = useRef<HTMLDivElement>(null);

  // 🔥 LIMITE DE COLUNAS
  const MAX_COLS = 5;
  const visibleCourses = selectedCourses.slice(0, MAX_COLS);
  const hiddenCount = selectedCourses.length - MAX_COLS;

  // 🔥 mapa cursos
  const cursosMap = useMemo(() => {
    const map: Record<string, string> = {};
    (cursos || []).forEach((c: any) => {
      if (c?.id) map[c.id] = c.fullname;
    });
    return map;
  }, [cursos]);

  // 🔥 normalização
  const notasNormalizadas = useMemo(() => {
    if (!Array.isArray(notas)) return [];

    return notas.map((r: any) => {
      const notasMap: Record<string, any> = {};

      (cursos || []).forEach((c: any) => {
        const dado = r?.[c?.fullname];
        if (dado) {
          notasMap[c.id] = dado;
        }
      });

      return { ...r, notasMap };
    });
  }, [notas, cursos]);

  // 🔥 cor nota
  const getGradeColor = useCallback((media: number) => {
    if (media >= 8) return 'excellent';
    if (media >= 7) return 'good';
    if (media >= 6) return 'average';
    if (media >= 5) return 'fair';
    return 'poor';
  }, []);

  // 🔥 processamento
  const processedNotas = useMemo(() => {
    const search = (searchTerm || '').toLowerCase();

    let result = notasNormalizadas
      .filter((r: any) => {
        if (!r?.nome) return false;
        if (search && !r.nome.toLowerCase().includes(search)) return false;
        return true;
      })
      .map((r: any) => {
        let soma = 0;
        let count = 0;

        for (const courseId of selectedCourses || []) {
          const media = Number(r?.notasMap?.[courseId]?.media || 0);
          if (media > 0) {
            soma += media;
            count++;
          }
        }

        return {
          ...r,
          mediaGeralSelecionada: count ? soma / count : 0,
        };
      });

    if (minGrade > 0) {
      result = result.filter((r) => r.mediaGeralSelecionada >= minGrade);
    }

    result.sort((a, b) =>
      sortBy === 'nome'
        ? a.nome.localeCompare(b.nome)
        : b.mediaGeralSelecionada - a.mediaGeralSelecionada
    );

    return result;
  }, [notasNormalizadas, selectedCourses, searchTerm, sortBy, minGrade]);

  // 🔥 virtualização
  const rowVirtualizer = useVirtualizer({
    count: processedNotas.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  if (!Array.isArray(notas) || notas.length === 0) {
    return <div className="empty-state">Selecione cursos</div>;
  }

  return (
    <div className="table-wrapper">

      {/* 🔥 HEADER */}
      <div className="virtual-header virtual-row">
        <div className="cell nome-col"><strong>Nome</strong></div>
        <div className="cell media-geral-col"><strong>Média Geral</strong></div>

        {visibleCourses.map((courseId) => (
          <div key={courseId} className="cell grade-col">
            <strong title={cursosMap[courseId]}>
              {cursosMap[courseId]}
            </strong>
          </div>
        ))}

        {hiddenCount > 0 && (
          <div className="cell grade-col more-col">
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* 🔥 LISTA */}
      <div
        ref={parentRef}
        style={{
          height: '500px',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const residente = processedNotas[virtualRow.index];
            if (!residente) return null;

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="virtual-row"
              >
                <div className="cell nome-col">
                  {residente.nome}
                </div>

                <div className={`cell media-geral-col ${getGradeColor(residente.mediaGeralSelecionada)}`}>
                  {residente.mediaGeralSelecionada.toFixed(2)}
                </div>

                {visibleCourses.map((courseId) => {
                  const dado = residente?.notasMap?.[courseId];

                  return (
                    <div
                      key={courseId}
                      className="cell grade-col"
                      title={`${cursosMap[courseId]} - ${dado?.media ?? 'Sem nota'}`}
                    >
                      {dado ? (
                        <span className={`grade-value ${getGradeColor(Number(dado.media))}`}>
                          {dado.media}
                        </span>
                      ) : '-'}
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <div className="cell grade-col more-col">...</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="table-footer">
        Mostrando {processedNotas.length} de {notas.length}
      </div>
    </div>
  );
}
